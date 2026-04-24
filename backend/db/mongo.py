"""
MongoDB async connection using Motor.
"""
import os
import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "seethru_db")

_client: AsyncIOMotorClient = AsyncIOMotorClient(MONGO_URI)
db = _client[DB_NAME]


async def save_analysis(result: dict) -> None:
	"""Persist analysis output in the `analyses` collection with timestamp."""
	doc = dict(result)
	doc.setdefault("timestamp", datetime.datetime.utcnow())
	await db["analyses"].insert_one(doc)

# Collections
# db["analyses"]   - all analysis results
# db["alerts"]     - high-risk detections
# db["news_cache"] - cached news articles
# db["users"]      - optional user sessions
