from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Response
from models.schemas import AnalyzeRequest, TextRequest, URLRequest, AnalysisResponse
from agent.graph import run_graph
import base64
import re
import uuid

router = APIRouter()


def _get_session_id(request: Request, response: Response) -> str:
    """Get or create a session ID from cookies."""
    sid = request.cookies.get("seethru_session")
    if not sid:
        sid = str(uuid.uuid4())
        response.set_cookie("seethru_session", sid, max_age=86400 * 30, httponly=True, samesite="lax")
    return sid


def _detect_input_type(content: str) -> str:
    """Auto-detect if input is a URL or plain text."""
    url_pattern = r'^https?://[^\s]+$'
    if re.match(url_pattern, content.strip()):
        return "url"
    return "text"


@router.post("/text", response_model=AnalysisResponse)
async def analyze_text(request: TextRequest, req: Request, res: Response):
    try:
        sid = _get_session_id(req, res)
        result = await run_graph(input_type="text", content=request.text, session_id=sid)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=AnalysisResponse)
@router.post("/", response_model=AnalysisResponse)
async def analyze_unified(request: AnalyzeRequest, req: Request, res: Response):
    """Unified analyzer endpoint for /api/analyze."""
    try:
        sid = _get_session_id(req, res)
        return await run_graph(
            input_type=request.input_type,
            content=request.content,
            mime_type=request.mime_type or "image/jpeg",
            session_id=sid,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto")
async def analyze_auto(request: TextRequest, req: Request, res: Response):
    """Unified endpoint — auto-detects text vs URL."""
    try:
        sid = _get_session_id(req, res)
        input_type = _detect_input_type(request.text)
        result = await run_graph(input_type=input_type, content=request.text, session_id=sid)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/url", response_model=AnalysisResponse)
async def analyze_url(request: URLRequest, req: Request, res: Response):
    try:
        sid = _get_session_id(req, res)
        result = await run_graph(input_type="url", content=request.url, session_id=sid)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image", response_model=AnalysisResponse)
async def analyze_image(req: Request, res: Response, file: UploadFile = File(...)):
    try:
        sid = _get_session_id(req, res)
        contents = await file.read()
        image_b64 = base64.b64encode(contents).decode("utf-8")
        result = await run_graph(
            input_type="image",
            content=image_b64,
            mime_type=file.content_type,
            session_id=sid,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_history(limit: int = 50):
    try:
        from db.mongo import db
        cursor = db["analyses"].find(
            {}, {"_id": 0}
        ).sort("timestamp", -1).limit(limit)
        analyses = await cursor.to_list(length=limit)
        return {"analyses": analyses}
    except Exception:
        return {"analyses": []}


@router.get("/stats")
async def get_stats():
    try:
        from db.mongo import db
        col = db["analyses"]
        total = await col.count_documents({})
        high_risk = await col.count_documents({"label": "HIGH RISK"})
        suspicious = await col.count_documents({"label": "SUSPICIOUS"})
        safe = await col.count_documents({"label": "SAFE"})
        return {
            "total": total,
            "high_risk": high_risk,
            "suspicious": suspicious,
            "safe": safe,
        }
    except Exception:
        return {"total": 0, "high_risk": 0, "suspicious": 0, "safe": 0}
