"""Text classifier tool using Ollama (local LLM).

Returns the required schema:
{is_fake: bool, confidence: float, explanation: str}
"""

import asyncio

from utils.ollama_client import ollama_chat, parse_json_response

_SYSTEM_PROMPT = """You are a misinformation detection agent.
Analyze the user text and return ONLY JSON with EXACT keys:
{
  "is_fake": <true|false>,
  "confidence": <float 0.0-1.0>,
  "explanation": "<brief explanation>"
}
No markdown. No extra keys."""

_FALLBACK = {
    "is_fake": False,
    "confidence": 0.5,
    "explanation": "Classification unavailable at the moment.",
}


async def classify_text(text: str) -> dict:
    raw = await ollama_chat(
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        temperature=0.1,
        timeout=30,
    )
    if raw is None:
        return dict(_FALLBACK)

    parsed = parse_json_response(raw)
    if parsed is None:
        return dict(_FALLBACK)

    return {
        "is_fake": bool(parsed.get("is_fake", False)),
        "confidence": float(parsed.get("confidence", 0.5)),
        "explanation": str(parsed.get("explanation", "Unable to classify confidently.")),
    }


def classify_text_sync(text: str) -> dict:
    return asyncio.get_event_loop().run_until_complete(classify_text(text))
