"""Phishing URL detector using Groq + feature extraction.

Returns the requested schema:
{is_phishing: bool, risk_score: float, reasons: list}
"""

import asyncio
import datetime
import ipaddress
import json
import os
import re
import urllib.parse
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

SUSPICIOUS_KEYWORDS = [
    "login",
    "verify",
    "secure",
    "update",
    "account",
    "bank",
    "confirm",
    "payment",
    "reset",
]
SUSPICIOUS_TLDS = {".xyz", ".tk", ".ml", ".ga", ".cf", ".gq", ".top", ".click"}


async def _domain_age_days(hostname: str) -> Optional[int]:
    if not hostname:
        return None
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            response = await client.get(f"https://rdap.org/domain/{hostname}")
            response.raise_for_status()
            payload = response.json()
        events = payload.get("events", [])
        for event in events:
            if event.get("eventAction") in {"registration", "registered"}:
                raw_date = event.get("eventDate")
                if not raw_date:
                    continue
                created = datetime.datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                return max((datetime.datetime.now(datetime.timezone.utc) - created).days, 0)
    except Exception:
        return None
    return None


def _extract_features(url: str) -> dict:
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return {"error": "invalid URL"}

    hostname = parsed.hostname or ""
    path = parsed.path or ""
    query = parsed.query or ""

    is_ip = False
    try:
        ipaddress.ip_address(hostname)
        is_ip = True
    except ValueError:
        pass

    tld = "." + hostname.split(".")[-1] if "." in hostname else ""
    has_https = parsed.scheme == "https"
    url_length = len(url)
    special_char_count = len(re.findall(r"[@!%&=+\$]", url))
    lower_url = (hostname + path + query).lower()
    matched_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in lower_url]
    suspicious_tld = tld in SUSPICIOUS_TLDS

    return {
        "url": url,
        "hostname": hostname,
        "url_length": url_length,
        "special_char_count": special_char_count,
        "suspicious_keywords": matched_keywords,
        "suspicious_tld": suspicious_tld,
        "is_ip_host": is_ip,
        "has_https": has_https,
    }


def _clamp(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = default
    return min(max(number, 0.0), 1.0)


def _heuristic_score(features: dict, domain_age_days: Optional[int]) -> tuple[float, list[str]]:
    score = 0.0
    reasons: list[str] = []

    if features.get("url_length", 0) >= 80:
        score += 0.2
        reasons.append("Unusually long URL")
    if features.get("special_char_count", 0) >= 3:
        score += 0.2
        reasons.append("High number of special characters")
    if features.get("suspicious_keywords"):
        score += 0.25
        reasons.append(
            f"Suspicious keywords: {', '.join(features['suspicious_keywords'][:4])}"
        )
    if features.get("suspicious_tld"):
        score += 0.15
        reasons.append("Suspicious top-level domain")
    if features.get("is_ip_host"):
        score += 0.2
        reasons.append("Hostname is an IP address")
    if not features.get("has_https"):
        score += 0.1
        reasons.append("URL does not use HTTPS")
    if domain_age_days is not None and domain_age_days < 120:
        score += 0.2
        reasons.append(f"Very new domain ({domain_age_days} days old)")

    return min(round(score, 3), 1.0), reasons


def _safe_parse(raw: str) -> dict:
    value = raw.strip()
    if value.startswith("```"):
        value = value.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    parsed = json.loads(value)
    reasons = parsed.get("reasons") or []
    if not isinstance(reasons, list):
        reasons = [str(reasons)]
    return {
        "is_phishing": bool(parsed.get("is_phishing", False)),
        "risk_score": _clamp(parsed.get("risk_score"), 0.0),
        "reasons": [str(reason) for reason in reasons[:8]],
        "reasoning": str(parsed.get("reasoning", "")),
    }


async def _groq_classify(
    url: str,
    features: dict,
    domain_age_days: Optional[int],
    heuristic_score: float,
    heuristic_reasons: list[str],
) -> Optional[dict]:
    prompt = f"""
You are SEETHRU's Groq-powered phishing URL analyst.
Analyze the URL with the extracted features. Treat heuristic signals as clues,
not final proof. Return only JSON with exactly these keys:
{{
  "is_phishing": <true|false>,
  "risk_score": <float 0.0-1.0>,
  "reasons": ["<short reason>", "..."],
  "reasoning": "<one concise sentence>"
}}

URL: {url}
Extracted features: {features}
Domain age days: {domain_age_days}
Heuristic score: {heuristic_score}
Heuristic reasons: {heuristic_reasons}
""".strip()
    try:
        response = await asyncio.to_thread(
            _client.chat.completions.create,
            model=_MODEL,
            messages=[
                {"role": "system", "content": "Return valid JSON only. No markdown."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=400,
        )
        return _safe_parse(response.choices[0].message.content or "")
    except Exception:
        return None


async def detect_url(url: str) -> dict:
    features = _extract_features(url)
    hostname = features.get("hostname", "")
    domain_age_days = await _domain_age_days(hostname)
    heuristic_score, heuristic_reasons = _heuristic_score(features, domain_age_days)

    groq_result = await _groq_classify(
        url,
        features,
        domain_age_days,
        heuristic_score,
        heuristic_reasons,
    )
    if groq_result and "risk_score" in groq_result:
        model_score = _clamp(groq_result.get("risk_score"), heuristic_score)
        blended = round((heuristic_score * 0.5) + (model_score * 0.5), 3)
        merged_reasons = heuristic_reasons + list(groq_result.get("reasons", []))
        return {
            "is_phishing": bool(blended >= 0.6),
            "risk_score": blended,
            "reasons": merged_reasons[:8],
            "reasoning": groq_result.get("reasoning") or "; ".join(merged_reasons[:3]),
            "features": {
                **features,
                "domain_age_days": domain_age_days,
            },
            "provider": "groq",
        }

    fallback_reasons = heuristic_reasons or ["No strong phishing indicators found."]
    return {
        "is_phishing": bool(heuristic_score >= 0.6),
        "risk_score": heuristic_score,
        "reasons": fallback_reasons,
        "reasoning": "; ".join(fallback_reasons[:3]),
        "features": {
            **features,
            "domain_age_days": domain_age_days,
        },
        "provider": "heuristic-fallback",
    }


def detect_url_sync(url: str) -> dict:
    return asyncio.run(detect_url(url))
