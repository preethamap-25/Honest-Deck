"""
Continuous monitoring / watchlist routes.
Users can add URLs or claims to a watchlist that gets re-checked on demand
or via a scheduled trigger (e.g. cron hitting POST /monitor/run).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.mongo import db
from agent.graph import run_graph
import datetime
import uuid
import asyncio

router = APIRouter()


class WatchlistItem(BaseModel):
    input_type: str  # "text" or "url"
    content: str
    label: Optional[str] = None  # user-friendly label


@router.post("/watchlist")
async def add_to_watchlist(item: WatchlistItem):
    if item.input_type not in {"text", "url"}:
        raise HTTPException(status_code=400, detail="input_type must be text or url")
    if not item.content.strip():
        raise HTTPException(status_code=400, detail="content must not be empty")

    doc = {
        "watch_id": str(uuid.uuid4()),
        "input_type": item.input_type,
        "content": item.content.strip(),
        "label": item.label or item.content[:60],
        "created_at": datetime.datetime.utcnow(),
        "last_checked": None,
        "last_result": None,
        "check_count": 0,
        "active": True,
    }
    await db["watchlist"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/watchlist")
async def list_watchlist():
    cursor = db["watchlist"].find({"active": True}, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=100)
    return {"items": items, "count": len(items)}


@router.delete("/watchlist/{watch_id}")
async def remove_from_watchlist(watch_id: str):
    result = await db["watchlist"].update_one(
        {"watch_id": watch_id}, {"$set": {"active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Removed from watchlist"}


@router.post("/run")
async def run_monitoring():
    """Re-check all active watchlist items. Call via cron or manually."""
    cursor = db["watchlist"].find({"active": True})
    items = await cursor.to_list(length=100)

    if not items:
        return {"checked": 0, "results": []}

    results = []
    for item in items:
        try:
            result = await asyncio.wait_for(
                run_graph(input_type=item["input_type"], content=item["content"]),
                timeout=30,
            )
            summary = {
                "watch_id": item["watch_id"],
                "label": result.get("label", "UNKNOWN"),
                "risk_score": result.get("risk_score", 0),
                "verdict": result.get("verdict", "Unknown"),
                "checked_at": datetime.datetime.utcnow(),
            }
            await db["watchlist"].update_one(
                {"watch_id": item["watch_id"]},
                {
                    "$set": {
                        "last_checked": summary["checked_at"],
                        "last_result": summary,
                    },
                    "$inc": {"check_count": 1},
                },
            )
            results.append(summary)
        except Exception:
            results.append({
                "watch_id": item["watch_id"],
                "error": "Check timed out or failed",
            })

    return {"checked": len(results), "results": results}


@router.get("/history/{watch_id}")
async def watch_history(watch_id: str):
    """Get all past analysis results for a watchlist item."""
    item = await db["watchlist"].find_one({"watch_id": watch_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    cursor = db["analyses"].find(
        {"content_preview": {"$regex": item["content"][:40]}}, {"_id": 0}
    ).sort("timestamp", -1).limit(20)
    analyses = await cursor.to_list(length=20)

    return {"item": item, "analyses": analyses}
