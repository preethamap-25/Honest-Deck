"""
Input Preprocessing Module — Layer 1 of SEETHRU Architecture.

Handles:
 - Text normalization (strip whitespace, collapse spaces, fix encoding)
 - Format validation (URL / text / image detection)
 - Metadata extraction (word count, language hint, URL parts, image size)
"""

import re
import urllib.parse
from typing import Optional


def normalize_text(text: str) -> str:
    """Normalize input text: strip, collapse whitespace, remove zero-width chars."""
    text = text.strip()
    # Remove zero-width characters
    text = re.sub(r"[\u200b\u200c\u200d\ufeff]", "", text)
    # Collapse multiple whitespace to single space
    text = re.sub(r"\s+", " ", text)
    return text


def detect_input_type(content: str) -> str:
    """Auto-detect whether content is a URL, base64 image, or plain text."""
    stripped = content.strip()
    if re.match(r"^https?://[^\s]+$", stripped):
        return "url"
    # Base64 images are typically very long and contain only base64 chars
    if len(stripped) > 200 and re.match(r"^[A-Za-z0-9+/=\s]+$", stripped[:500]):
        return "image"
    return "text"


def extract_metadata(content: str, input_type: str) -> dict:
    """Extract useful metadata from the input for downstream analysis."""
    meta: dict = {"input_type": input_type, "char_count": len(content)}

    if input_type == "text":
        words = content.split()
        meta["word_count"] = len(words)
        meta["sentence_count"] = len(re.split(r"[.!?]+", content.strip()))
        # Detect if it looks like ALL CAPS (common in misinformation)
        alpha_chars = re.sub(r"[^a-zA-Z]", "", content)
        if alpha_chars and len(alpha_chars) > 10:
            upper_ratio = sum(1 for c in alpha_chars if c.isupper()) / len(alpha_chars)
            meta["upper_ratio"] = round(upper_ratio, 3)

    elif input_type == "url":
        try:
            parsed = urllib.parse.urlparse(content.strip())
            meta["scheme"] = parsed.scheme
            meta["hostname"] = parsed.hostname or ""
            meta["path"] = parsed.path
            meta["has_query"] = bool(parsed.query)
        except Exception:
            meta["parse_error"] = True

    elif input_type == "image":
        meta["b64_length"] = len(content)

    return meta


def preprocess(content: str, input_type: Optional[str] = None) -> dict:
    """Full preprocessing pipeline: normalize, detect type, extract metadata."""
    if input_type in ("text", "url"):
        content = normalize_text(content)

    if not input_type or input_type not in {"text", "url", "image"}:
        input_type = detect_input_type(content)

    metadata = extract_metadata(content, input_type)

    return {
        "content": content,
        "input_type": input_type,
        "metadata": metadata,
    }
