from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone, timedelta
from typing import List
from bson import ObjectId

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.claim import ClaimStatus, ClaimOut

router = APIRouter()


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
