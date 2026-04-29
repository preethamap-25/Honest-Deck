"""Phishing URL detector using Ollama llama3 + feature extraction.

Returns the requested schema:
{is_phishing: bool, risk_score: float, reasons: list}
"""

import asyncio
import datetime
import ipaddress
import re
import urllib.parse
from typing import Optional

import httpx

from utils.ollama_client import ollama_chat, parse_json_response

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
    "signin",
    "password",
    "credential",
    "wallet",
    "suspend",
    "unlock",
    "alert",
    "expire",
    "urgent",
]
SUSPICIOUS_TLDS = {
    ".xyz", ".tk", ".ml", ".ga", ".cf", ".gq", ".top", ".click",
    ".buzz", ".site", ".online", ".icu", ".club", ".info", ".work",
    ".rest", ".fit", ".link", ".surf",
}
BRAND_KEYWORDS = [
    "paypal", "apple", "google", "microsoft", "amazon", "netflix",
    "facebook", "instagram", "whatsapp", "chase", "wellsfargo",
    "bankofamerica", "citibank", "hsbc",
]

# Official domains — brand keyword on these hosts is NOT impersonation
LEGITIMATE_DOMAINS = {
    "paypal": {"paypal.com"},
    "apple": {"apple.com", "icloud.com"},
    "google": {"google.com", "googleapis.com", "google.co.in", "google.co.uk", "googlevideo.com"},
    "microsoft": {"microsoft.com", "live.com", "outlook.com", "office.com"},
    "amazon": {"amazon.com", "amazon.in", "amazon.co.uk", "amazonaws.com"},
    "netflix": {"netflix.com"},
    "facebook": {"facebook.com", "fb.com"},
    "instagram": {"instagram.com"},
    "whatsapp": {"whatsapp.com"},
    "chase": {"chase.com"},
    "wellsfargo": {"wellsfargo.com"},
    "bankofamerica": {"bankofamerica.com"},
    "citibank": {"citibank.com", "citi.com"},
    "hsbc": {"hsbc.com"},
}


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

    # Additional features for better detection
    hyphen_count = hostname.count("-")
    subdomain_depth = max(0, hostname.count(".") - 1)
    path_lower = path.lower()
    path_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in path_lower]
    brand_matches = []
    host_lower = hostname.lower()
    # Extract the registrable domain (last two parts, e.g. "google.com")
    host_parts = host_lower.split(".")
    registrable = ".".join(host_parts[-2:]) if len(host_parts) >= 2 else host_lower
    for b in BRAND_KEYWORDS:
        if b in host_lower:
            legit = LEGITIMATE_DOMAINS.get(b, set())
            if registrable not in legit:
                brand_matches.append(b)
    has_at_sign = "@" in url
    # Ratio of digits in hostname
    digits_in_host = sum(c.isdigit() for c in hostname)
    digit_ratio = digits_in_host / max(len(hostname), 1)

    return {
        "url": url,
        "hostname": hostname,
        "url_length": url_length,
        "special_char_count": special_char_count,
        "suspicious_keywords": matched_keywords,
        "suspicious_tld": suspicious_tld,
        "is_ip_host": is_ip,
        "has_https": has_https,
        "hyphen_count": hyphen_count,
        "subdomain_depth": subdomain_depth,
        "path_keywords": path_keywords,
        "brand_matches": brand_matches,
        "has_at_sign": has_at_sign,
        "digit_ratio": round(digit_ratio, 3),
    }


def _heuristic_score(features: dict, domain_age_days: Optional[int]) -> tuple[float, list[str]]:
    score = 0.0
    reasons: list[str] = []

    # ── URL length ──────────────────────────────────────────────
    url_len = features.get("url_length", 0)
    if url_len >= 100:
        score += 0.2
        reasons.append("Very long URL")
    elif url_len >= 60:
        score += 0.1
        reasons.append("Moderately long URL")

    # ── Special characters ──────────────────────────────────────
    if features.get("special_char_count", 0) >= 3:
        score += 0.15
        reasons.append("High number of special characters")

    # ── @ sign in URL (credential harvesting trick) ─────────────
    if features.get("has_at_sign"):
        score += 0.25
        reasons.append("URL contains @ sign (redirect trick)")

    # ── Suspicious keywords — scaled by count ───────────────────
    kw_list = features.get("suspicious_keywords", [])
    kw_count = len(kw_list)
    if kw_count >= 4:
        score += 0.4
        reasons.append(f"Multiple phishing keywords ({kw_count}): {', '.join(kw_list[:5])}")
    elif kw_count >= 2:
        score += 0.25
        reasons.append(f"Suspicious keywords: {', '.join(kw_list[:4])}")
    elif kw_count == 1:
        score += 0.1
        reasons.append(f"Suspicious keyword: {kw_list[0]}")

    # ── Path keywords ───────────────────────────────────────────
    path_kw = features.get("path_keywords", [])
    if path_kw:
        score += min(0.15, len(path_kw) * 0.07)
        reasons.append(f"Phishing keywords in path: {', '.join(path_kw[:3])}")

    # ── Suspicious TLD ──────────────────────────────────────────
    if features.get("suspicious_tld"):
        score += 0.2
        reasons.append("Suspicious top-level domain")

    # ── Hyphens in hostname ─────────────────────────────────────
    hyphens = features.get("hyphen_count", 0)
    if hyphens >= 3:
        score += 0.2
        reasons.append(f"Excessive hyphens in domain ({hyphens})")
    elif hyphens >= 1:
        score += 0.1
        reasons.append(f"Hyphens in domain name ({hyphens})")

    # ── Subdomain depth ─────────────────────────────────────────
    depth = features.get("subdomain_depth", 0)
    if depth >= 3:
        score += 0.2
        reasons.append(f"Deep subdomain chain (depth {depth})")
    elif depth >= 2:
        score += 0.1
        reasons.append(f"Multiple subdomains (depth {depth})")

    # ── IP address as hostname ──────────────────────────────────
    if features.get("is_ip_host"):
        score += 0.25
        reasons.append("Hostname is an IP address")

    # ── No HTTPS ────────────────────────────────────────────────
    if not features.get("has_https"):
        score += 0.1
        reasons.append("URL does not use HTTPS")

    # ── Brand impersonation ─────────────────────────────────────
    brands = features.get("brand_matches", [])
    if brands:
        score += 0.3
        reasons.append(f"Possible brand impersonation: {', '.join(brands)}")

    # ── High digit ratio in hostname ────────────────────────────
    if features.get("digit_ratio", 0) >= 0.3:
        score += 0.1
        reasons.append("High ratio of digits in hostname")

    # ── Domain age ──────────────────────────────────────────────
    if domain_age_days is not None and domain_age_days < 120:
        score += 0.2
        reasons.append(f"Very new domain ({domain_age_days} days old)")

    # ── Combination bonus: multiple signals compound the risk ───
    signal_count = sum([
        kw_count >= 2,
        features.get("suspicious_tld", False),
        hyphens >= 1,
        len(brands) > 0,
        features.get("is_ip_host", False),
        not features.get("has_https", True),
        domain_age_days is not None and domain_age_days < 120,
    ])
    if signal_count >= 3:
        bonus = min(0.15, signal_count * 0.05)
        score += bonus
        reasons.append(f"Multiple risk signals detected ({signal_count})")

    return min(round(score, 3), 1.0), reasons


async def _ollama_classify(url: str, features: dict, domain_age_days: Optional[int]) -> Optional[dict]:
    prompt = (
        f"You are a cybersecurity expert. Analyze this URL for phishing risk.\n"
        f"URL: {url}\n"
        f"Extracted features: {features}\n"
        f"Domain age days: {domain_age_days}\n\n"
        f"Respond with ONLY valid JSON:\n"
        '{"is_phishing": true, "risk_score": 0.0, "reasons": ["..."]}'
    )
    raw = await ollama_chat(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        timeout=15,
    )
    return parse_json_response(raw) if raw else None


async def detect_url(url: str) -> dict:
    features = _extract_features(url)
    hostname = features.get("hostname", "")
    domain_age_days = await _domain_age_days(hostname)
    heuristic_score, heuristic_reasons = _heuristic_score(features, domain_age_days)

    try:
        ollama_result = await asyncio.wait_for(
            _ollama_classify(url, features, domain_age_days),
            timeout=10,
        )
    except Exception:
        ollama_result = None
    if ollama_result and "risk_score" in ollama_result:
        model_score = float(ollama_result.get("risk_score", heuristic_score))
        blended = round((heuristic_score * 0.5) + (model_score * 0.5), 3)
        merged_reasons = heuristic_reasons + list(ollama_result.get("reasons", []))
        return {
            "is_phishing": bool(blended >= 0.5),
            "risk_score": blended,
            "reasons": merged_reasons[:8],
            "features": {
                **features,
                "domain_age_days": domain_age_days,
            },
        }

    return {
        "is_phishing": bool(heuristic_score >= 0.5),
        "risk_score": heuristic_score,
        "reasons": heuristic_reasons or ["No strong phishing indicators found."],
        "features": {
            **features,
            "domain_age_days": domain_age_days,
        },
    }


def detect_url_sync(url: str) -> dict:
    return asyncio.get_event_loop().run_until_complete(detect_url(url))
