from fastapi import APIRouter, Depends, HTTPException, Query, Request
from datetime import datetime, timezone, timedelta
from typing import List
from bson import ObjectId
import httpx
import logging

from app.core.security import get_current_user
from app.core.database import get_db
from app.core.config import settings
from app.models.claim import ClaimStatus, ClaimOut

router = APIRouter()
logger = logging.getLogger(__name__)

# Per-country news cache: { "us": {"items": [...], "fetched_at": datetime}, ... }
_news_cache: dict[str, dict] = {}
# IP → country cache (avoid repeated lookups)
_geo_cache: dict[str, tuple[str, datetime]] = {}


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    db = get_db()

    # Aggregate claim counts by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = {doc["_id"]: doc["count"] async for doc in db.claims.aggregate(pipeline)}

    total_claims   = await db.claims.count_documents({})
    total_verdicts = await db.verdicts.count_documents({})
    pending        = status_counts.get(ClaimStatus.PENDING, 0)
    processing     = status_counts.get(ClaimStatus.PROCESSING, 0)

    # Claims submitted in last 24h
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_claims = await db.claims.count_documents({"created_at": {"$gte": since}})

    # Human-reviewed verdicts
    human_reviewed = await db.verdicts.count_documents({"reviewed_by_human": True})

    return {
        "total_claims": total_claims,
        "total_verdicts": total_verdicts,
        "claims_last_24h": recent_claims,
        "human_reviewed_verdicts": human_reviewed,
        "by_status": status_counts,
        "queue": {
            "pending": pending,
            "processing": processing,
        },
    }


@router.get("/queue", response_model=List[ClaimOut])
async def get_queue(
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    """Returns pending + processing claims sorted by priority desc, then created_at asc."""
    db = get_db()
    cursor = db.claims.find(
        {"status": {"$in": [ClaimStatus.PENDING, ClaimStatus.PROCESSING]}}
    ).sort([("priority", -1), ("created_at", 1)]).limit(limit)
    return [ClaimOut(**_serialize(doc)) async for doc in cursor]


@router.post("/queue/{claim_id}/reprocess", status_code=202)
async def reprocess_claim(
    claim_id: str,
    background_tasks=None,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        oid = ObjectId(claim_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid claim ID")

    result = await db.claims.update_one(
        {"_id": oid},
        {"$set": {"status": ClaimStatus.PENDING, "updated_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Claim not found")

    return {"message": "Claim queued for reprocessing", "claim_id": claim_id}


@router.delete("/sessions", status_code=204)
async def revoke_all_sessions(current_user: dict = Depends(get_current_user)):
    """Revoke all active refresh tokens (force re-login)."""
    db = get_db()
    await db.refresh_tokens.delete_many({"username": current_user["username"]})


@router.get("/activity")
async def recent_activity(
    days: int = Query(7, ge=1, le=90),
    current_user: dict = Depends(get_current_user),
):
    """Daily claim submission counts over the last N days."""
    db = get_db()
    since = datetime.now(timezone.utc) - timedelta(days=days)
    pipeline = [
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {
            "_id": {
                "year": {"$year": "$created_at"},
                "month": {"$month": "$created_at"},
                "day": {"$dayOfMonth": "$created_at"},
            },
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    result = []
    async for doc in db.claims.aggregate(pipeline):
        d = doc["_id"]
        result.append({
            "date": f"{d['year']}-{d['month']:02d}-{d['day']:02d}",
            "count": doc["count"],
        })
    return result



@router.get("/feed")
async def live_feed_combined(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """Combined feed: user-submitted claims + location-based live news.
    Auto-detects user country from IP for relevant headlines."""
    db = get_db()

    # 1. Fetch user-submitted claims from DB
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "verdicts",
            "localField": "_id",
            "foreignField": "claim_id",
            "as": "verdict_docs",
        }},
    ]

    feed_items = []
    async for doc in db.claims.aggregate(pipeline):
        verdict_doc = doc.get("verdict_docs", [None])[0] if doc.get("verdict_docs") else None
        item = {
            "id": str(doc["_id"]),
            "text": doc.get("text", ""),
            "source": doc.get("source", "api"),
            "source_url": doc.get("source_url"),
            "status": doc.get("status", "pending"),
            "priority": doc.get("priority", 0),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
            "checking": doc.get("status") in ["pending", "processing"],
            "verdict": None,
            "confidence": None,
            "explanation": None,
            "risk_level": None,
        }
        if verdict_doc:
            item["verdict"] = verdict_doc.get("label")
            item["confidence"] = verdict_doc.get("confidence")
            item["explanation"] = verdict_doc.get("explanation", "")[:200]
            item["risk_level"] = verdict_doc.get("risk_level", "suspicious")
        feed_items.append(item)

    # 2. Fill remaining slots with location-based live news
    news_slots = max(0, limit - len(feed_items))
    if news_slots > 0:
        client_ip = request.client.host if request.client else "127.0.0.1"
        country = await _get_country_from_ip(client_ip)
        news_items = await _fetch_news(news_slots, country=country)
        feed_items.extend(news_items)

    return {"items": feed_items, "total": len(feed_items), "country": country if news_slots > 0 else None}


@router.get("/alerts")
async def get_alerts(
    current_user: dict = Depends(get_current_user),
):
    """Get high-risk content alerts — items marked as dangerous or high-confidence false."""
    db = get_db()

    # Find verdicts that are high-risk: false with high confidence, or marked dangerous
    alert_pipeline = [
        {"$match": {
            "$or": [
                {"label": "false", "confidence": {"$gte": settings.ALERT_FALSE_CONFIDENCE}},
                {"label": "misleading", "confidence": {"$gte": settings.ALERT_MISLEADING_CONFIDENCE}},
            ]
        }},
        {"$sort": {"created_at": -1}},
        {"$limit": 20},
    ]

    alerts = []
    async for doc in db.verdicts.aggregate(alert_pipeline):
        alerts.append({
            "id": str(doc["_id"]),
            "claim_id": doc.get("claim_id"),
            "label": doc.get("label"),
            "confidence": doc.get("confidence"),
            "explanation": doc.get("explanation", "")[:300],
            "risk_level": doc.get("risk_level", "dangerous"),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
            "reviewed": doc.get("reviewed_by_human", False),
        })

    return {"alerts": alerts, "count": len(alerts)}


async def _get_country_from_ip(client_ip: str) -> str:
    """Detect country code from IP using ip-api.com (free, no key needed)."""
    now = datetime.now(timezone.utc)

    # Check geo cache (1-hour TTL)
    if client_ip in _geo_cache:
        code, cached_at = _geo_cache[client_ip]
        if (now - cached_at).seconds < settings.GEO_CACHE_TTL_SECONDS:
            return code

    # Localhost / private IPs default to configured country
    if client_ip in ("127.0.0.1", "::1", "localhost") or client_ip.startswith(("10.", "192.168.", "172.")):
        _geo_cache[client_ip] = (settings.DEFAULT_COUNTRY, now)
        return settings.DEFAULT_COUNTRY

    try:
        async with httpx.AsyncClient(timeout=5) as http:
            resp = await http.get(f"{settings.GEO_LOOKUP_URL}/{client_ip}?fields=countryCode")
            data = resp.json()
            code = data.get("countryCode", settings.DEFAULT_COUNTRY).lower()
            _geo_cache[client_ip] = (code, now)
            logger.info(f"Geo lookup: {client_ip} → {code}")
            return code
    except Exception as e:
        logger.warning(f"Geo lookup failed for {client_ip}: {e}")
        _geo_cache[client_ip] = (settings.DEFAULT_COUNTRY, now)
        return settings.DEFAULT_COUNTRY


# NewsAPI country codes it supports
_NEWSAPI_COUNTRIES = {
    "ae", "ar", "at", "au", "be", "bg", "br", "ca", "ch", "cn", "co", "cu",
    "cz", "de", "eg", "fr", "gb", "gr", "hk", "hu", "id", "ie", "il", "in",
    "it", "jp", "kr", "lt", "lv", "ma", "mx", "my", "ng", "nl", "no", "nz",
    "ph", "pl", "pt", "ro", "rs", "ru", "sa", "se", "sg", "si", "sk", "th",
    "tr", "tw", "ua", "us", "ve", "za",
}


async def _fetch_news(limit: int = 20, country: str = "us") -> list:
    """Fetch trending news from NewsAPI by country with per-country caching (5-min TTL)."""
    now = datetime.now(timezone.utc)

    # Normalize country; fall back to 'us' if unsupported
    country = country.lower()
    if country not in _NEWSAPI_COUNTRIES:
        country = settings.DEFAULT_COUNTRY

    # Return cache if fresh
    cached = _news_cache.get(country)
    if cached and cached.get("fetched_at") and (now - cached["fetched_at"]).seconds < settings.NEWS_CACHE_TTL_SECONDS:
        return cached["items"][:limit]

    if not settings.NEWS_API_KEY:
        return []

    # Country name mapping for fallback 'everything' search
    _COUNTRY_NAMES = {
        "in": "India", "us": "United States", "gb": "United Kingdom",
        "au": "Australia", "ca": "Canada", "de": "Germany", "fr": "France",
        "jp": "Japan", "br": "Brazil", "mx": "Mexico", "kr": "South Korea",
        "it": "Italy", "es": "Spain", "nl": "Netherlands", "se": "Sweden",
        "no": "Norway", "sg": "Singapore", "za": "South Africa", "ae": "UAE",
        "sa": "Saudi Arabia", "eg": "Egypt", "ng": "Nigeria", "my": "Malaysia",
        "ph": "Philippines", "id": "Indonesia", "th": "Thailand", "tw": "Taiwan",
        "hk": "Hong Kong", "cn": "China", "ru": "Russia", "ua": "Ukraine",
        "tr": "Turkey", "il": "Israel", "pk": "Pakistan", "bd": "Bangladesh",
    }

    try:
        articles = []
        async with httpx.AsyncClient(timeout=10) as client:
            # Try top-headlines first
            resp = await client.get(
                f"{settings.NEWS_API_BASE_URL}/top-headlines",
                params={
                    "apiKey": settings.NEWS_API_KEY,
                    "country": country,
                    "pageSize": min(limit, 50),
                },
            )
            resp.raise_for_status()
            articles = resp.json().get("articles", [])

            # Fallback to 'everything' if top-headlines returns nothing
            if not articles:
                country_name = _COUNTRY_NAMES.get(country, country.upper())
                resp = await client.get(
                    f"{settings.NEWS_API_BASE_URL}/everything",
                    params={
                        "apiKey": settings.NEWS_API_KEY,
                        "q": f"{country_name} news",
                        "language": "en",
                        "sortBy": "publishedAt",
                        "pageSize": min(limit, 50),
                    },
                )
                resp.raise_for_status()
                articles = resp.json().get("articles", [])
        items = []
        for i, art in enumerate(articles):
            items.append({
                "id": f"news-{country}-{i}-{now.strftime('%H%M')}",
                "text": art.get("title", ""),
                "source": art.get("source", {}).get("name", "unknown"),
                "source_url": art.get("url"),
                "status": "live",
                "priority": 5,
                "created_at": art.get("publishedAt") or now.isoformat(),
                "checking": False,
                "verdict": None,
                "confidence": None,
                "explanation": art.get("description") or art.get("title", ""),
                "risk_level": None,
                "image_url": art.get("urlToImage"),
                "country": country,
            })

        _news_cache[country] = {"items": items, "fetched_at": now}
        logger.info(f"Fetched {len(items)} news articles for country={country}")
        return items[:limit]
    except Exception as e:
        logger.warning(f"NewsAPI fetch failed for {country}: {e}")
        return _news_cache.get(country, {}).get("items", [])[:limit]


@router.get("/news")
async def get_news(
    request: Request,
    limit: int = Query(20, ge=1, le=50),
    country: str = Query(None, min_length=2, max_length=2),
    current_user: dict = Depends(get_current_user),
):
    """Fetch live trending news headlines based on user's location.
    Auto-detects country from IP if not specified."""
    if not country:
        client_ip = request.client.host if request.client else "127.0.0.1"
        country = await _get_country_from_ip(client_ip)
    items = await _fetch_news(limit, country=country)
    return {"items": items, "total": len(items), "country": country}
