from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security import get_current_user
from app.services.verifier import verify_claim

router = APIRouter()


class AnalyzeRequest(BaseModel):
    text: str


class AnalyzeResponse(BaseModel):
    label: str
    confidence: float
    explanation: str
    reasoning_steps: list
    evidence: list
    key_entities: list
    suggested_sources: list
    model_used: str
    verified_at: str
    requires_human_review: bool = False


@router.post("/text", response_model=AnalyzeResponse, status_code=200)
async def analyze_text(
    body: AnalyzeRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Analyze a text claim and return immediate verdict from Groq.
    This is a synchronous endpoint for real-time fact-checking.
    """
    result = await verify_claim(body.text)
    return result
