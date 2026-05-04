from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ClaimStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    VERIFIED = "verified"
    FALSE = "false"
    MISLEADING = "misleading"
    UNVERIFIABLE = "unverifiable"


class ClaimCreate(BaseModel):
    text: str = Field(..., min_length=1)
    source: Optional[str] = "api"
    source_url: Optional[str] = None


class ClaimUpdate(BaseModel):
    text: Optional[str] = None
    status: Optional[ClaimStatus] = None
    priority: Optional[int] = None


class ClaimOut(BaseModel):
    id: str
    text: str
    status: ClaimStatus = ClaimStatus.PENDING
    source: str = "api"
    source_url: Optional[str] = None
    priority: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class VerdictCreate(BaseModel):
    claim_id: str
    label: str
    confidence: float = Field(ge=0, le=1)
    explanation: str = ""
    evidence: List[str] = []
    risk_level: str = "suspicious"
    reviewed_by_human: bool = False


class VerdictUpdate(BaseModel):
    label: Optional[str] = None
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    explanation: Optional[str] = None
    evidence: Optional[List[str]] = None
    risk_level: Optional[str] = None
    reviewed_by_human: Optional[bool] = None


class VerdictOut(BaseModel):
    id: str
    claim_id: str
    label: str
    confidence: float
    explanation: str = ""
    evidence: List[str] = []
    risk_level: str = "suspicious"
    reviewed_by_human: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
