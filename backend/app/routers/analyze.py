from fastapi import APIRouter, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
import re

from app.core.security import get_current_user
from app.services.verifier import verify_claim

router = APIRouter()


# ── Input models ──────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    """Unified input — the agent dynamically detects whether this is text, URL, or mixed."""
    text: str
    input_type: Optional[str] = None  # auto-detected if not provided


class AnalyzeURLRequest(BaseModel):
    """Dedicated URL analysis endpoint for phishing/safety checks."""
    url: str
    context: Optional[str] = None


class AnalyzeResponse(BaseModel):
    label: str
    confidence: float
    explanation: str
    reasoning_steps: list
    evidence: list
    key_entities: list
    suggested_sources: list
    risk_level: str = "suspicious"
    input_type: str = "text"
    model_used: str
    verified_at: str
    requires_human_review: bool = False


# ── Dynamic unified endpoint ──────────────────────────────────────────────────

@router.post("/text", response_model=AnalyzeResponse, status_code=200)
async def analyze_text(
    body: AnalyzeRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Dynamic analysis endpoint — SeeThru Central Agent.
    Automatically detects input type (text/URL/mixed) and orchestrates
    the appropriate verification tools dynamically.
    """
    result = await verify_claim(body.text, input_type=body.input_type)
    return result


@router.post("/url", response_model=AnalyzeResponse, status_code=200)
async def analyze_url(
    body: AnalyzeURLRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    URL safety analysis — phishing detection, domain reputation, SSL verification.
    Routes directly to URL verification tools via the central agent.
    """
    claim_text = f"Check if this URL is safe: {body.url}"
    result = await verify_claim(
        claim_text=claim_text,
        source_url=body.url,
        context=body.context,
        input_type="url",
    )
    return result


@router.post("/image", response_model=AnalyzeResponse, status_code=200)
async def analyze_image(
    file: UploadFile = File(...),
    context: str = Form(default=""),
    current_user: dict = Depends(get_current_user),
):
    """
    Image authenticity analysis.
    Examines image metadata, EXIF data, and structural indicators
    to detect manipulation or AI-generated content.
    """
    import hashlib
    from datetime import datetime, timezone

    # Read and analyze image metadata
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()[:16]
    file_size = len(content)
    filename = file.filename or "unknown"

    # Extract basic image metadata
    metadata_info = _extract_image_metadata(content, filename)

    claim_text = (
        f"Analyze the authenticity of an uploaded image. "
        f"Filename: {filename}, Size: {file_size} bytes, Hash: {file_hash}. "
        f"Metadata findings: {metadata_info}. "
        f"Context: {context}" if context else
        f"Analyze the authenticity of an uploaded image. "
        f"Filename: {filename}, Size: {file_size} bytes, Hash: {file_hash}. "
        f"Metadata findings: {metadata_info}."
    )

    result = await verify_claim(
        claim_text=claim_text,
        input_type="image",
    )
    return result


def _extract_image_metadata(content: bytes, filename: str) -> str:
    """Extract image metadata for authenticity analysis."""
    indicators = []

    try:
        from PIL import Image
        from PIL.ExifTags import TAGS
        import io

        img = Image.open(io.BytesIO(content))
        indicators.append(f"Format: {img.format}, Size: {img.size[0]}x{img.size[1]}")

        # Check EXIF data
        exif_data = img._getexif()
        if exif_data:
            indicators.append("EXIF data present (suggests real camera photo)")
            for tag_id, value in list(exif_data.items())[:10]:
                tag = TAGS.get(tag_id, tag_id)
                if tag in ("Software", "Make", "Model", "DateTime"):
                    indicators.append(f"{tag}: {value}")
        else:
            indicators.append("No EXIF data (could be screenshot, AI-generated, or stripped)")

        # Check for AI generation markers in metadata
        info = img.info or {}
        if "parameters" in info or "prompt" in str(info).lower():
            indicators.append("AI generation parameters detected in metadata")
        if "stable diffusion" in str(info).lower() or "midjourney" in str(info).lower():
            indicators.append("AI tool signature found in metadata")

    except ImportError:
        indicators.append("Image analysis library not available (Pillow not installed)")
    except Exception as e:
        indicators.append(f"Metadata extraction partial: {str(e)[:100]}")

    return "; ".join(indicators) if indicators else "No metadata extracted"
