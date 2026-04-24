from fastapi import APIRouter, HTTPException, Body
from typing import Any, Dict
from ..database import get_db

router = APIRouter()

# Default user ID for a single-user system context
USER_ID = "usr-123"

@router.get("/")
async def get_user():
    db = get_db()
    user = await db.users.find_one({"id": USER_ID}, {"_id": 0})
    if not user:
        # Create a mock default user if not exists
        default_user = {
            "id": USER_ID,
            "profile": {
                "id": USER_ID,
                "name": "Sarah Chen",
                "email": "sarah.chen@example.com",
                "avatar": "https://i.pravatar.cc/150?u=sarah",
                "role": "Premium Analyst",
                "status": "active",
                "joinDate": "2023-11-15T00:00:00Z",
                "stats": {
                    "checksCompleted": 142,
                    "accuracyScore": 98,
                    "sourcesVerified": 450
                }
            },
            "prefs": {
                "notifMessages": True,
                "notifUpdates": True,
                "notifWeekly": False,
                "soundEnabled": False,
                "compactMode": False,
                "codeLineNumbers": True,
                "streamResponses": True,
                "saveHistory": True,
                "language": "en",
                "fontSize": "medium",
                "sensitivity": "balanced",
                "autoScanUrls": True,
                "trustedSources": ["Reuters", "AP", "BBC", "WHO", "CDC"]
            }
        }
        await db.users.insert_one(default_user)
        return {"profile": default_user["profile"], "prefs": default_user["prefs"]}
    
    return {"profile": user.get("profile", {}), "prefs": user.get("prefs", {})}

@router.put("/profile")
async def update_profile(updates: Dict[str, Any] = Body(...)):
    db = get_db()
    # Flatten updates for profile
    set_query = {f"profile.{k}": v for k, v in updates.items()}
    result = await db.users.update_one({"id": USER_ID}, {"$set": set_query})
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Profile not updated")
    return {"status": "success"}

@router.put("/prefs")
async def update_prefs(updates: Dict[str, Any] = Body(...)):
    db = get_db()
    set_query = {f"prefs.{k}": v for k, v in updates.items()}
    result = await db.users.update_one({"id": USER_ID}, {"$set": set_query})
    return {"status": "success"}
