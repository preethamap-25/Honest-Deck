import os
import uvicorn
from dotenv import load_dotenv

from app.api.routes import app

load_dotenv()


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("MODEL_HOST", "127.0.0.1"),
        port=int(os.getenv("MODEL_PORT", "8001")),
        reload=os.getenv("MODEL_RELOAD", "true").lower() == "true",
    )
