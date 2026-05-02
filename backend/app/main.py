from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import connect_db, close_db
from app.routers import auth, claims, verdicts, admin, analyze
from app.middleware.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="FactCheck API",
    description="Real-time fact-checking backend with single-user login",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)

app.include_router(auth.router,     prefix="/api/v1/auth",     tags=["auth"])
app.include_router(analyze.router,  prefix="/api/analyze",     tags=["analyze"])
app.include_router(claims.router,   prefix="/api/v1/claims",   tags=["claims"])
app.include_router(verdicts.router, prefix="/api/v1/verdicts", tags=["verdicts"])
app.include_router(admin.router,    prefix="/api/v1/admin",    tags=["admin"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
