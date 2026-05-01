"""Real-time text fact checker using Groq.

The live backend intentionally does not call the local ``model/`` service. It
uses retrieved web evidence plus Groq reasoning and returns a compact schema the
agent graph can aggregate into the product response.
"""

import asyncio
import json
import os
from typing import Any

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

_client = Groq(api_key=os.getenv("GROQ_API_KEY", "").strip())
_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()

_SYSTEM_PROMPT = """You are SEETHRU, a real-time fact-checking agent.
Judge the user claim using the provided evidence snippets. Do not claim certainty
when evidence is weak, missing, or only loosely related.

Return ONLY JSON with EXACT keys:
{
  "verdict": "<REAL|FAKE|MISLEADING|UNVERIFIED>",
  "is_fake": <true|false>,
  "risk_score": <float 0.0-1.0>,
  "confidence": <float 0.0-1.0>,
  "explanation": "<brief evidence-grounded explanation>",
  "red_flags": ["<short reason>", "..."]
}
Rules:
- REAL means credible evidence directly supports the claim.
- FAKE means credible evidence directly contradicts the claim.
- MISLEADING means the claim mixes truth with missing context or distortion.
- UNVERIFIED means evidence is insufficient or unavailable.
- risk_score is misinformation risk: REAL near 0.0, UNVERIFIED around 0.45,
  MISLEADING around 0.55-0.75, FAKE above 0.75 when confident.
- is_fake is true only for FAKE or MISLEADING.
No markdown. No extra keys."""


def _clamp(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = default
    return min(max(number, 0.0), 1.0)


def _normalise_verdict(value: Any) -> str:
    verdict = str(value or "UNVERIFIED").strip().upper()
    if verdict not in {"REAL", "FAKE", "MISLEADING", "UNVERIFIED"}:
        return "UNVERIFIED"
    return verdict


def _fallback_result(reason: str) -> dict:
    return {
        "verdict": "UNVERIFIED",
        "is_fake": False,
        "risk_score": 0.45,
        "confidence": 0.0,
        "explanation": reason,
        "red_flags": ["Evidence or Groq classification was unavailable."],
    }


def _safe_parse(raw: str) -> dict:
    value = raw.strip()
    if value.startswith("```"):
        value = value.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    parsed = json.loads(value)
    verdict = _normalise_verdict(parsed.get("verdict"))
    return {
        "verdict": verdict,
        "is_fake": verdict in {"FAKE", "MISLEADING"} or bool(parsed.get("is_fake", False)),
        "risk_score": _clamp(parsed.get("risk_score"), 0.45),
        "confidence": _clamp(parsed.get("confidence"), 0.0),
        "explanation": str(parsed.get("explanation", "Unable to classify confidently.")),
        "red_flags": list(parsed.get("red_flags") or []),
    }


def _format_evidence(evidence: list[dict] | None) -> str:
    if not evidence:
        return "No live evidence snippets were found."

    lines = []
    for index, item in enumerate(evidence[:6], start=1):
        snippet = str(item.get("snippet", "")).strip()
        source = str(item.get("source", "web")).strip()
        if snippet:
            lines.append(f"{index}. Source: {source}\nSnippet: {snippet}")
    return "\n\n".join(lines) or "No usable live evidence snippets were found."


async def classify_text(text: str, evidence: list[dict] | None = None) -> dict:
    evidence_context = _format_evidence(evidence)
    try:
        response = await asyncio.to_thread(
            _client.chat.completions.create,
            model=_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Claim or text to fact-check:\n{text}\n\n"
                        f"Live evidence snippets:\n{evidence_context}"
                    ),
                },
            ],
            temperature=0.1,
            max_tokens=500,
        )
        raw = response.choices[0].message.content or ""
        return _safe_parse(raw)
    except Exception:
        return _fallback_result("Groq fact-checking is unavailable at the moment.")


def classify_text_sync(text: str, evidence: list[dict] | None = None) -> dict:
    return asyncio.run(classify_text(text, evidence=evidence))
