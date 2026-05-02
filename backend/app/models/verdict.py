from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class VerdictLabel(str, Enum):
    TRUE         = "true"
    FALSE        = "false"
    MISLEADING   = "misleading"
    PARTIALLY_TRUE = "partially_true"
    UNVERIFIABLE = "unverifiable"
    SATIRE       = "satire"


class EvidenceItem(BaseModel):
    source: str = Field(..., description="Source name or URL")
    excerpt: Optional[str] = Field(None, max_length=1000)
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    supports_claim: bool


class VerdictCreate(BaseModel):
    claim_id: str
    label: VerdictLabel
    confidence: float = Field(..., ge=0.0, le=1.0, description="0=low, 1=certain")
    explanation: str = Field(..., min_length=20, max_length=5000)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    reviewed_by_human: bool = False
    notes: Optional[str] = Field(None, max_length=2000)


class VerdictOut(BaseModel):
    id: str
    claim_id: str
    label: VerdictLabel
    confidence: float
    explanation: str
    evidence: List[EvidenceItem]
    reviewed_by_human: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class VerdictUpdate(BaseModel):
    label: Optional[VerdictLabel] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    explanation: Optional[str] = Field(None, min_length=20, max_length=5000)
    evidence: Optional[List[EvidenceItem]] = None
    reviewed_by_human: Optional[bool] = None
    notes: Optional[str] = None
