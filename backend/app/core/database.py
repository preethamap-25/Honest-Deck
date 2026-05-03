from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        serverSelectionTimeoutMS=settings.MONGO_TIMEOUT_MS,
    )
    db = client[settings.MONGODB_DB_NAME]
    # Test connection
    try:
        await client.admin.command("ping")
        logger.info(f"Connected to MongoDB: {settings.MONGODB_DB_NAME}")
    except Exception as e:
        logger.warning(f"MongoDB ping failed: {e}. Server will start but DB operations may fail.")
    await _create_indexes()


async def close_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")


async def _create_indexes():
    try:
        await db.claims.create_index("status")
        await db.claims.create_index("created_at")
        await db.claims.create_index("priority", background=True)
        await db.claims.create_index([("text", "text")])          # full-text search
        await db.verdicts.create_index("claim_id")
        await db.verdicts.create_index("created_at")
        await db.refresh_tokens.create_index("token", unique=True)
        await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)  # TTL index
    except Exception as e:
        logger.warning(f"Index creation failed (will retry on next startup): {e}")


def get_db():
    return db
