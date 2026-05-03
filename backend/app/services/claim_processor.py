"""
Background claim processor.

Pipeline per claim:
  1. Language detection
  2. Deduplication (MongoDB full-text search)
  3. Priority scoring
  4. Groq verification (llama-3.3-70b-versatile)
  5. Verdict written to DB + claim status updated
"""

import logging
from datetime import datetime, timezone
from bson import ObjectId

from app.core.database import get_db
from app.core.config import settings
from app.models.claim import ClaimStatus
from app.services.verifier import verify_claim

logger = logging.getLogger(__name__)

LABEL_TO_STATUS = {
    "true": ClaimStatus.VERIFIED,
    "false": ClaimStatus.FALSE,
    "misleading": ClaimStatus.MISLEADING,
    "partially_true": ClaimStatus.MISLEADING,
    "unverifiable": ClaimStatus.UNVERIFIABLE,
}


async def process_claim_async(claim_id: str):
    db = get_db()
    try:
        oid = ObjectId(claim_id)
        claim = await db.claims.find_one({"_id": oid})
        if not claim:
            logger.warning(f"process_claim_async: claim {claim_id} not found")
            return

        await _set_status(db, oid, ClaimStatus.PROCESSING)

        language = await _detect_language(claim["text"])

        duplicate_id = await _find_duplicate(db, claim["text"], exclude_id=oid)
        if duplicate_id:
            logger.info(f"Claim {claim_id} is a near-duplicate of {duplicate_id}")
            await db.claims.update_one(
                {"_id": oid},
                {"$set": {
                    "status": ClaimStatus.UNVERIFIABLE,
                    "duplicate_of": str(duplicate_id),
                    "language": language,
                    "updated_at": datetime.now(timezone.utc),
                }},
            )
            return

        priority_boost = _compute_priority(claim["text"])
        new_priority = min(10, claim.get("priority", 0) + priority_boost)
        await db.claims.update_one(
            {"_id": oid},
            {"$set": {
                "language": language,
                "priority": new_priority,
                "updated_at": datetime.now(timezone.utc),
            }},
        )

        verdict_data = await verify_claim(
            claim_text=claim["text"],
            context=claim.get("context"),
            source_url=claim.get("source_url"),
            language=language,
        )

        await _save_verdict(db, claim_id, verdict_data)
        new_status = LABEL_TO_STATUS.get(verdict_data["label"], ClaimStatus.UNVERIFIABLE)
        needs_review = (
            verdict_data.get("requires_human_review", False)
            or verdict_data["confidence"] < settings.HUMAN_REVIEW_CONFIDENCE_THRESHOLD
        )

        await db.claims.update_one(
            {"_id": oid},
            {"$set": {
                "status": new_status,
                "needs_human_review": needs_review,
                "updated_at": datetime.now(timezone.utc),
            }},
        )

        logger.info(
            f"Claim {claim_id} -> {verdict_data['label']} "
            f"(confidence={verdict_data['confidence']:.2f}, review={needs_review})"
        )

    except Exception as e:
        logger.error(f"process_claim_async error for {claim_id}: {e}", exc_info=True)
        try:
            await db.claims.update_one(
                {"_id": ObjectId(claim_id)},
                {"$set": {
                    "status": ClaimStatus.PENDING,
                    "processing_error": str(e),
                    "updated_at": datetime.now(timezone.utc),
                }},
            )
        except Exception:
            pass


async def _set_status(db, oid: ObjectId, status: ClaimStatus):
    await db.claims.update_one(
        {"_id": oid},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}},
    )


async def _detect_language(text: str) -> str:
    try:
        from langdetect import detect
        return detect(text)
    except Exception:
        return "en"


async def _find_duplicate(db, text: str, exclude_id: ObjectId):
    result = await db.claims.find_one(
        {
            "$text": {"$search": text},
            "_id": {"$ne": exclude_id},
            "status": {"$nin": [ClaimStatus.PENDING, ClaimStatus.PROCESSING]},
        },
        {"score": {"$meta": "textScore"}},
        sort=[("score", {"$meta": "textScore"})],
    )
    if result and result.get("score", 0) > settings.DUPLICATE_SCORE_THRESHOLD:
        return result["_id"]
    return None


def _compute_priority(text: str) -> int:
    urgent_keywords = [
        "breaking", "just in", "confirmed", "official", "president",
        "died", "arrested", "attack", "war", "election", "leaked",
        "exclusive", "urgent", "developing",
    ]
    text_lower = text.lower()
    hits = sum(1 for kw in urgent_keywords if kw in text_lower)
    return min(3, hits)


async def _save_verdict(db, claim_id: str, verdict_data: dict):
    from app.core.config import settings
    now = datetime.now(timezone.utc)
    await db.verdicts.insert_one({
        "claim_id": claim_id,
        "label": verdict_data["label"],
        "confidence": verdict_data["confidence"],
        "explanation": verdict_data["explanation"],
        "reasoning_steps": verdict_data.get("reasoning_steps", []),
        "evidence": verdict_data.get("evidence", []),
        "key_entities": verdict_data.get("key_entities", []),
        "suggested_sources": verdict_data.get("suggested_sources", []),
        "model_used": verdict_data.get("model_used", settings.GROQ_MODEL),
        "reviewed_by_human": False,
        "auto_generated": True,
        "created_at": now,
        "updated_at": now,
    })
