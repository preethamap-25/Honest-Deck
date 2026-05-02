"""
Groq-powered fact-checking verifier.

Model: llama-3.3-70b-versatile (free tier)
- 30 RPM / 6,000 TPM / 1,000 RPD on free tier
- Best free model for multi-step reasoning and structured JSON output

Flow:
    claim text
        -> build prompt with optional web-fetched context
        -> call Groq with JSON response format enforced
        -> parse + validate verdict structure
        -> return to claim_processor for DB write
"""

import httpx
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """\
You are an expert fact-checker with deep knowledge of journalism, science, and current events.

Your task:
1. Carefully analyze the claim provided.
2. Reason step-by-step about what you know about this topic.
3. Assess the claim's accuracy based on established facts and logical reasoning.
4. Return ONLY a single valid JSON object — no markdown, no preamble, no explanation outside JSON.

Required JSON structure:
{
  "label": "<one of: true | false | misleading | partially_true | unverifiable>",
  "confidence": <float 0.0–1.0, e.g. 0.87>,
  "explanation": "<clear 2-4 sentence explanation of your verdict>",
  "reasoning_steps": [
    "<step 1 of your reasoning>",
    "<step 2>",
    "<step 3>"
  ],
  "evidence": [
    {
      "source": "<name or URL of source>",
      "excerpt": "<brief relevant fact or quote, max 200 chars>",
      "relevance_score": <float 0.0–1.0>,
      "supports_claim": <true|false>
    }
  ],
  "key_entities": ["<entity1>", "<entity2>"],
  "suggested_sources": ["<url or publication to verify further>"]
}

Label definitions:
- true: claim is accurate and well-supported
- false: claim is factually incorrect
- misleading: contains factual elements but creates a false impression
- partially_true: some parts are accurate, others are not
- unverifiable: insufficient public evidence to make a determination

Confidence guide:
- 0.9–1.0: very high certainty, strong evidence
- 0.7–0.89: reasonably confident
- 0.5–0.69: moderate confidence, some uncertainty
- 0.3–0.49: low confidence, limited evidence
- 0.0–0.29: very uncertain

Return ONLY the JSON object. No other text.
"""


async def verify_claim(
    claim_text: str,
    context: Optional[str] = None,
    source_url: Optional[str] = None,
    language: str = "en",
    retries: int = 2,
) -> dict:
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set — returning unverifiable stub verdict")
        return _stub_verdict(claim_text, reason="GROQ_API_KEY not configured")

    user_message = _build_user_message(claim_text, context, source_url, language)

    last_error = None
    for attempt in range(retries + 1):
        try:
            raw = await _call_groq(user_message)
            verdict = _parse_verdict(raw)
            logger.info(
                f"Verdict: {verdict['label']} (confidence={verdict['confidence']:.2f})"
            )
            return verdict

        except GroqRateLimitError as e:
            wait = 60
            logger.warning(f"Groq rate limit hit — waiting {wait}s (attempt {attempt + 1})")
            await asyncio.sleep(wait)
            last_error = e

        except GroqAPIError as e:
            wait = 2 ** attempt
            logger.warning(f"Groq API error: {e} — retrying in {wait}s")
            await asyncio.sleep(wait)
            last_error = e

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Groq JSON response: {e}")
            last_error = e
            break

    logger.error(f"verify_claim failed after {retries + 1} attempts: {last_error}")
    return _stub_verdict(claim_text, reason=f"Verification failed: {last_error}")


async def _call_groq(user_message: str) -> str:
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_message},
        ],
        "max_tokens": settings.GROQ_MAX_TOKENS,
        "temperature": settings.GROQ_TEMPERATURE,
        "response_format": {"type": "json_object"},
        "stream": False,
    }

    async with httpx.AsyncClient(timeout=settings.GROQ_REQUEST_TIMEOUT) as client:
        resp = await client.post(GROQ_CHAT_URL, headers=headers, json=payload)

        if resp.status_code == 429:
            raise GroqRateLimitError(f"Rate limit: {resp.text}")
        if resp.status_code >= 500:
            raise GroqAPIError(f"Groq server error {resp.status_code}: {resp.text}")
        if resp.status_code >= 400:
            raise GroqAPIError(f"Groq client error {resp.status_code}: {resp.text}")

        data = resp.json()

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise GroqAPIError(f"Unexpected Groq response shape: {e} — {data}")


def _build_user_message(
    claim: str,
    context: Optional[str],
    source_url: Optional[str],
    language: str,
) -> str:
    parts = [f"Claim to fact-check: {claim}"]

    if context:
        parts.append(f"Surrounding context: {context}")
    if source_url:
        parts.append(f"Source URL: {source_url}")
    if language != "en":
        parts.append(
            f"Note: The claim is in language '{language}'. "
            "Analyze in that language but return JSON labels/fields in English."
        )

    parts.append(
        "\nPlease analyze this claim carefully and return your verdict as a JSON object."
    )
    return "\n\n".join(parts)


def _parse_verdict(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    data = json.loads(raw)

    valid_labels = {"true", "false", "misleading", "partially_true", "unverifiable"}
    label = data.get("label", "unverifiable").lower().strip()
    if label not in valid_labels:
        logger.warning(f"Unexpected label '{label}' — defaulting to unverifiable")
        label = "unverifiable"

    confidence = float(data.get("confidence", 0.5))
    confidence = max(0.0, min(1.0, confidence))

    evidence = []
    for item in data.get("evidence", []):
        try:
            evidence.append({
                "source": str(item.get("source", "unknown")),
                "excerpt": str(item.get("excerpt", ""))[:500],
                "relevance_score": float(item.get("relevance_score", 0.5)),
                "supports_claim": bool(item.get("supports_claim", False)),
            })
        except Exception:
            continue

    return {
        "label": label,
        "confidence": confidence,
        "explanation": str(data.get("explanation", "No explanation provided.")),
        "reasoning_steps": data.get("reasoning_steps", []),
        "evidence": evidence,
        "key_entities": data.get("key_entities", []),
        "suggested_sources": data.get("suggested_sources", []),
        "model_used": settings.GROQ_MODEL,
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }


class GroqRateLimitError(Exception):
    pass


class GroqAPIError(Exception):
    pass


def _stub_verdict(claim_text: str, reason: str = "") -> dict:
    return {
        "label": "unverifiable",
        "confidence": 0.0,
        "explanation": f"Automated verification unavailable. {reason}".strip(),
        "reasoning_steps": [],
        "evidence": [],
        "key_entities": [],
        "suggested_sources": [],
        "model_used": "none",
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "requires_human_review": True,
    }
