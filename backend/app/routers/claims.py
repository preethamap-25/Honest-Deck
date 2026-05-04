from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import logging
import math

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.claim import ClaimCreate, ClaimUpdate, ClaimOut, ClaimStatus

router = APIRouter()
logger = logging.getLogger(__name__)


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("/", response_model=ClaimOut, status_code=201)
async def create_claim(
    body: ClaimCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        "text": body.text,
        "source": body.source or "api",
        "source_url": body.source_url,
        "status": ClaimStatus.PENDING,
        "priority": 0,
        "created_at": now,
        "updated_at": now,
        "user": current_user.get("sub", current_user.get("username", "")),
    }
    result = await db.claims.insert_one(doc)
    doc["_id"] = result.inserted_id
    return ClaimOut(**_serialize(doc))


@router.get("/")
async def list_claims(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {}
    if status:
        query["status"] = status

    sort_dir = -1 if order == "desc" else 1
    skip = (page - 1) * page_size

    total = await db.claims.count_documents(query)
    cursor = db.claims.find(query).sort(sort_by, sort_dir).skip(skip).limit(page_size)
    items = [ClaimOut(**_serialize(doc)) async for doc in cursor]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total else 0,
    }


@router.get("/search")
async def search_claims(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {"$text": {"$search": q}}
    skip = (page - 1) * page_size

    total = await db.claims.count_documents(query)
    cursor = db.claims.find(query).skip(skip).limit(page_size)
    items = [ClaimOut(**_serialize(doc)) async for doc in cursor]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total else 0,
    }


@router.get("/{claim_id}", response_model=ClaimOut)
async def get_claim(
    claim_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        oid = ObjectId(claim_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid claim ID")

    doc = await db.claims.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Claim not found")
    return ClaimOut(**_serialize(doc))


@router.patch("/{claim_id}", response_model=ClaimOut)
async def update_claim(
    claim_id: str,
    body: ClaimUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        oid = ObjectId(claim_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid claim ID")

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.claims.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Claim not found")

    doc = await db.claims.find_one({"_id": oid})
    return ClaimOut(**_serialize(doc))


@router.delete("/{claim_id}", status_code=204)
async def delete_claim(
    claim_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        oid = ObjectId(claim_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid claim ID")

    result = await db.claims.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Claim not found")
