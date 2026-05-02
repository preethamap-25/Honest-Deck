from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from app.models.claim import ClaimCreate, ClaimUpdate, ClaimOut, ClaimListOut, ClaimStatus
from app.core.security import get_current_user
from app.core.database import get_db
from app.services.claim_processor import process_claim_async

router = APIRouter()


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("/", response_model=ClaimOut, status_code=201)
async def submit_claim(
    body: ClaimCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        **body.model_dump(),
        "status": ClaimStatus.PENDING,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.claims.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Kick off async processing (NLP extraction, deduplication, etc.)
    background_tasks.add_task(process_claim_async, str(result.inserted_id))

    return ClaimOut(**_serialize(doc))


@router.get("/", response_model=ClaimListOut)
async def list_claims(
    status: Optional[ClaimStatus] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", regex="^(created_at|priority|status)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
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

    return ClaimListOut(total=total, page=page, page_size=page_size, items=items)


@router.get("/search", response_model=ClaimListOut)
async def search_claims(
    q: str = Query(..., min_length=3),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {"$text": {"$search": q}}
    skip = (page - 1) * page_size
    total = await db.claims.count_documents(query)
    cursor = db.claims.find(query, {"score": {"$meta": "textScore"}}) \
        .sort([("score", {"$meta": "textScore"})]) \
        .skip(skip).limit(page_size)
    items = [ClaimOut(**_serialize(doc)) async for doc in cursor]
    return ClaimListOut(total=total, page=page, page_size=page_size, items=items)


@router.get("/{claim_id}", response_model=ClaimOut)
async def get_claim(claim_id: str, current_user: dict = Depends(get_current_user)):
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

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.claims.find_one_and_update(
        {"_id": oid},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Claim not found")
    return ClaimOut(**_serialize(result))


@router.delete("/{claim_id}", status_code=204)
async def delete_claim(claim_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        oid = ObjectId(claim_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid claim ID")

    result = await db.claims.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Claim not found")
