from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId


class ClaimStatus(str, Enum):
    PENDING     = "pending"
    PROCESSING  = "processing"
    VERIFIED    = "verified"
    FALSE       = "false"
    MISLEADING  = "misleading"
    UNVERIFIABLE = "unverifiable"


class ClaimSource(str, Enum):
    API         = "api"
    EXTENSION   = "extension"
    WEBSOCKET   = "websocket"
    MANUAL      = "manual"


class ClaimCreate(BaseModel):
    text: str = Field(..., min_length=10, max_length=5000, description="The claim text to fact-check")
    source: ClaimSource = ClaimSource.API
    source_url: Optional[str] = Field(None, max_length=2048)
    context: Optional[str] = Field(None, max_length=1000, description="Optional surrounding context")
    language: Optional[str] = Field("en", max_length=10)
    priority: int = Field(0, ge=0, le=10, description="0=normal, 10=urgent")

    @field_validator("text")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip()


class ClaimUpdate(BaseModel):
    status: Optional[ClaimStatus] = None
    priority: Optional[int] = Field(None, ge=0, le=10)


class ClaimOut(BaseModel):
    id: str
    text: str
    source: ClaimSource
    source_url: Optional[str]
    context: Optional[str]
    language: str
    priority: int
    status: ClaimStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class ClaimListOut(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ClaimOut]
