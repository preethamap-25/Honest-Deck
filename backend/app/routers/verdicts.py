from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
from bson import ObjectId
import logging

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.claim import VerdictCreate, VerdictUpdate, VerdictOut

router = APIRouter()
logger = logging.getLogger(__name__)


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    if "claim_id" in doc and isinstance(doc["claim_id"], ObjectId):
        doc["claim_id"] = str(doc["claim_id"])
    return doc


@router.post("/", response_model=VerdictOut, status_code=201)
async def create_verdict(
    body: VerdictCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        claim_oid = ObjectId(body.claim_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid claim ID")

    claim = await db.claims.find_one({"_id": claim_oid})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    now = datetime.now(timezone.utc)
    doc = {
        "claim_id": claim_oid,
        "label": body.label,
        "confidence": body.confidence,
        "explanation": body.explanation,
        "evidence": body.evidence,
        "risk_level": body.risk_level,
        "reviewed_by_human": body.reviewed_by_human,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.verdicts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return VerdictOut(**_serialize(doc))


@router.get("/claim/{claim_id}", response_model=List[VerdictOut])
async def get_claim_verdicts(
    claim_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        claim_oid = ObjectId(claim_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid claim ID")

    cursor = db.verdicts.find({"claim_id": claim_oid}).sort("created_at", -1)
    return [VerdictOut(**_serialize(doc)) async for doc in cursor]


@router.get("/{verdict_id}", response_model=VerdictOut)
async def get_verdict(
    verdict_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        oid = ObjectId(verdict_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid verdict ID")

    doc = await db.verdicts.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Verdict not found")
    return VerdictOut(**_serialize(doc))


@router.patch("/{verdict_id}", response_model=VerdictOut)
async def update_verdict(
    verdict_id: str,
    body: VerdictUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        oid = ObjectId(verdict_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid verdict ID")

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.verdicts.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Verdict not found")

    doc = await db.verdicts.find_one({"_id": oid})
    return VerdictOut(**_serialize(doc))


@router.delete("/{verdict_id}", status_code=204)
async def delete_verdict(
    verdict_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        oid = ObjectId(verdict_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid verdict ID")

    result = await db.verdicts.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Verdict not found")
