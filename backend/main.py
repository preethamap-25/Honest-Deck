import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import connect_to_mongo, close_mongo_connection
from .routers import user, checks

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(title="Honest-Deck API", lifespan=lifespan)

app.cors()

# Setup CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(user.router, prefix="/api/user", tags=["User"])
app.include_router(checks.router, prefix="/api/checks", tags=["Checks"])

@app.get("/")
async def root():
    return {"message": "Honest-Deck API is running"}
