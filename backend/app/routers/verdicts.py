from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from typing import List
from bson import ObjectId

from app.models.verdict import VerdictCreate, VerdictOut, VerdictUpdate
from app.models.claim import ClaimStatus
from app.core.security import get_current_user
from app.core.database import get_db

router = APIRouter()


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("/", response_model=VerdictOut, status_code=201)
async def create_verdict(
    body: VerdictCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    # Validate claim exists
    try:
        claim_oid = ObjectId(body.claim_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid claim_id")

    claim = await db.claims.find_one({"_id": claim_oid})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    now = datetime.now(timezone.utc)
    doc = {
        **body.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.verdicts.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Update claim status to match verdict label
    label_to_status = {
        "true": ClaimStatus.VERIFIED,
        "false": ClaimStatus.FALSE,
        "misleading": ClaimStatus.MISLEADING,
        "partially_true": ClaimStatus.MISLEADING,
        "unverifiable": ClaimStatus.UNVERIFIABLE,
        "satire": ClaimStatus.UNVERIFIABLE,
    }
    new_status = label_to_status.get(body.label.value, ClaimStatus.VERIFIED)
    await db.claims.update_one(
        {"_id": claim_oid},
        {"$set": {"status": new_status, "updated_at": now}},
    )

    return VerdictOut(**_serialize(doc))


@router.get("/claim/{claim_id}", response_model=List[VerdictOut])
async def get_verdicts_for_claim(
    claim_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    cursor = db.verdicts.find({"claim_id": claim_id}).sort("created_at", -1)
    return [VerdictOut(**_serialize(doc)) async for doc in cursor]


@router.get("/{verdict_id}", response_model=VerdictOut)
async def get_verdict(verdict_id: str, current_user: dict = Depends(get_current_user)):
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

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.verdicts.find_one_and_update(
        {"_id": oid},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Verdict not found")
    return VerdictOut(**_serialize(result))


@router.delete("/{verdict_id}", status_code=204)
async def delete_verdict(verdict_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        oid = ObjectId(verdict_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid verdict ID")

    result = await db.verdicts.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Verdict not found")
