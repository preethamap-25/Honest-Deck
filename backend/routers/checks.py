from fastapi import APIRouter, HTTPException, Body, BackgroundTasks
from typing import List, Any, Dict
from datetime import datetime, timezone
import uuid
from ..database import get_db
from ..models import Check, Message

router = APIRouter()

# Default user ID for context
USER_ID = "usr-123"

@router.get("/", response_model=List[Check])
async def get_checks():
    db = get_db()
    cursor = db.checks.find({"userId": USER_ID}).sort("updatedAt", -1)
    checks = await cursor.to_list(length=100)
    for check in checks:
        if "_id" in check:
            del check["_id"]
    return checks

@router.post("/", response_model=Check)
async def create_check(payload: Dict[str, Any] = Body(...)):
    db = get_db()
    title = payload.get("title", "New Fact-Check")
    
    new_check = {
        "id": f"check-{uuid.uuid4()}",
        "userId": USER_ID,
        "title": title,
        "verdict": None,
        "score": None,
        "messages": [],
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "pinned": False,
        "tags": []
    }
    await db.checks.insert_one(new_check)
    del new_check["userId"]
    if "_id" in new_check:
        del new_check["_id"]
    return new_check

@router.put("/{check_id}", response_model=Check)
async def update_check(check_id: str, updates: Dict[str, Any] = Body(...)):
    db = get_db()
    updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
    result = await db.checks.update_one(
        {"id": check_id, "userId": USER_ID},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Check not found")
        
    updated_check = await db.checks.find_one({"id": check_id})
    if "_id" in updated_check:
        del updated_check["_id"]
    return updated_check

@router.delete("/{check_id}")
async def delete_check(check_id: str):
    db = get_db()
    result = await db.checks.delete_one({"id": check_id, "userId": USER_ID})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Check not found")
    return {"status": "success"}

async def process_agent_message(check_id: str, content: str):
    # This is a stub for the LangChain/CrewAI agent execution
    # For now, we simulate a mock response
    db = get_db()
    import asyncio
    await asyncio.sleep(2) # Simulate work
    
    ai_msg = {
        "id": f"msg-{uuid.uuid4()}-ai",
        "role": "assistant",
        "content": f"FACT_CHECK_START\n{{\"verdict\": \"MOSTLY_TRUE\", \"score\": 85, \"summary\": \"AI processed this claim via FastAPI.\", \"claims\": [], \"sources\": [], \"assessment\": \"This is an AI stub response from the backend.\"}}\nFACT_CHECK_END",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.checks.update_one(
        {"id": check_id},
        {
            "$push": {"messages": ai_msg},
            "$set": {
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "verdict": "MOSTLY_TRUE",
                "score": 85
            }
        }
    )

@router.post("/{check_id}/messages", response_model=Dict[str, Any])
async def add_message(check_id: str, background_tasks: BackgroundTasks, payload: Dict[str, Any] = Body(...)):
    db = get_db()
    content = payload.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content is required")
        
    user_msg = {
        "id": f"msg-{uuid.uuid4()}",
        "role": "user",
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    check = await db.checks.find_one({"id": check_id, "userId": USER_ID})
    if not check:
        raise HTTPException(status_code=404, detail="Check not found")
        
    updates = {
        "$push": {"messages": user_msg},
        "$set": {"updatedAt": datetime.now(timezone.utc).isoformat()}
    }
    
    # If it's the first message, update the title
    if len(check.get("messages", [])) == 0:
        updates["$set"]["title"] = content[:60] + ("..." if len(content) > 60 else "")
        
    await db.checks.update_one({"id": check_id}, updates)
    
    # Trigger background task for the AI agent
    background_tasks.add_task(process_agent_message, check_id, content)
    
    return {"status": "processing", "message": user_msg}
