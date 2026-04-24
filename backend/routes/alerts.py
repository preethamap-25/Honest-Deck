from fastapi import APIRouter, HTTPException
from db.mongo import db
import datetime

router = APIRouter()


@router.get("/")
async def get_alerts(limit: int = 20):
    try:
        collection = db["alerts"]
        cursor = collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit)
        alerts = await cursor.to_list(length=limit)
        return {"alerts": alerts, "count": len(alerts)}
    except Exception:
        return {"alerts": [], "count": 0}


@router.delete("/{alert_id}")
async def dismiss_alert(alert_id: str):
    try:
        collection = db["alerts"]
        result = await collection.delete_one({"alert_id": alert_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"message": "Alert dismissed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
