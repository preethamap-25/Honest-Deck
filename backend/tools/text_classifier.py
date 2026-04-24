"""Text classifier tool using Groq.

Returns the required schema:
{is_fake: bool, confidence: float, explanation: str}
"""

import asyncio
import json
import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

_SYSTEM_PROMPT = """You are a misinformation detection agent.
Analyze the user text and return ONLY JSON with EXACT keys:
{
  "is_fake": <true|false>,
  "confidence": <float 0.0-1.0>,
  "explanation": "<brief explanation>"
}
No markdown. No extra keys."""


def _safe_parse(raw: str) -> dict:
    value = raw.strip()
    if value.startswith("```"):
        value = value.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    parsed = json.loads(value)
    return {
        "is_fake": bool(parsed.get("is_fake", False)),
        "confidence": float(parsed.get("confidence", 0.5)),
        "explanation": str(parsed.get("explanation", "Unable to classify confidently.")),
    }


async def classify_text(text: str) -> dict:
    try:
        response = await asyncio.to_thread(
            _client.chat.completions.create,
            model=_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0.1,
            max_tokens=300,
        )
        raw = response.choices[0].message.content or ""
        return _safe_parse(raw)
    except Exception:
        return {
            "is_fake": False,
            "confidence": 0.5,
            "explanation": "Classification unavailable at the moment.",
        }


def classify_text_sync(text: str) -> dict:
    return asyncio.get_event_loop().run_until_complete(classify_text(text))
