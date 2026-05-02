from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    await _create_indexes()
    logger.info(f"Connected to MongoDB: {settings.MONGODB_DB_NAME}")


async def close_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")


async def _create_indexes():
    await db.claims.create_index("status")
    await db.claims.create_index("created_at")
    await db.claims.create_index("priority", background=True)
    await db.claims.create_index([("text", "text")])          # full-text search
    await db.verdicts.create_index("claim_id")
    await db.verdicts.create_index("created_at")
    await db.refresh_tokens.create_index("token", unique=True)
    await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)  # TTL index


def get_db():
    return db
