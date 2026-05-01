from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import analyze, news, alerts, monitor

app = FastAPI(
    title="SEETHRU API",
    description="Centralized agentic AI system for misinformation detection",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/analyze", tags=["Analyze"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["API Analyze"])
app.include_router(news.router, prefix="/news", tags=["News"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(monitor.router, prefix="/monitor", tags=["Monitor"])


@app.get("/")
async def root():
    return {"message": "SEETHRU API is running", "status": "ok"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/cleanup")
async def cleanup_session():
    """Called on logout — drops ephemeral collections to free DB space."""
    try:
        from db.mongo import db
        await db.drop_collection("news_cache")
        return {"status": "cleaned"}
    except Exception:
        return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)


