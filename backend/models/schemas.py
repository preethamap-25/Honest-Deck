"""
Pydantic schemas for request/response validation.
"""
from typing import Any, List, Optional
from pydantic import BaseModel, HttpUrl, field_validator


class TextRequest(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("text must not be empty")
        if len(v) > 50_000:
            raise ValueError("text exceeds maximum length of 50 000 characters")
        return v.strip()


class URLRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def url_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("url must not be empty")
        return v.strip()


class AnalyzeRequest(BaseModel):
    input_type: str
    content: str
    mime_type: Optional[str] = "image/jpeg"

    @field_validator("input_type")
    @classmethod
    def validate_input_type(cls, v: str) -> str:
        value = v.strip().lower()
        if value not in {"text", "url", "image"}:
            raise ValueError("input_type must be one of: text, url, image")
        return value

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("content must not be empty")
        return v.strip()


class EvidenceItem(BaseModel):
    snippet: str
    source: str


class ToolResult(BaseModel):
    risk_score: float
    label: str
    reasoning: Optional[str] = None
    red_flags: Optional[List[str]] = None
    confidence: Optional[float] = None
    artifacts: Optional[List[str]] = None
    features: Optional[dict] = None


class AnalysisResponse(BaseModel):
    input_type: str
    risk_score: float
    label: str
    verdict: Optional[str] = None
    explanation: str
    text_result: Optional[Any] = None
    url_result: Optional[Any] = None
    image_result: Optional[Any] = None
    evidence: List[Any] = []
    alert_triggered: bool = False
    agent_steps: List[Any] = []


class AlertDocument(BaseModel):
    alert_id: str
    input_type: str
    label: str
    risk_score: float
    explanation: str
    timestamp: str
