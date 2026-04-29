"""
News article classifier — classifies fetched articles as REAL or FAKE using Ollama.
"""
import asyncio

from utils.ollama_client import ollama_chat, parse_json_response

_CLASSIFY_PROMPT = """You are an expert news verification agent. Given a news article title and description, classify it.
Return ONLY a valid JSON object:
{
  "verdict": "REAL" or "FAKE" or "UNVERIFIED",
  "confidence": <float 0.0-1.0>,
  "reason": "<one sentence why>"
}
No markdown. Only JSON."""


async def _classify_one(title: str, description: str) -> dict:
    text = f"Title: {title}\nDescription: {description or 'N/A'}"
    raw = await ollama_chat(
        messages=[
            {"role": "system", "content": _CLASSIFY_PROMPT},
            {"role": "user", "content": text},
        ],
        temperature=0.1,
        timeout=30,
    )
    if raw is None:
        return {"verdict": "UNVERIFIED", "confidence": 0.0, "reason": "Classification unavailable"}

    parsed = parse_json_response(raw)
    if parsed is None:
        return {"verdict": "UNVERIFIED", "confidence": 0.0, "reason": "Classification unavailable"}

    return parsed


async def classify_articles(articles: list) -> list:
    if not articles:
        return []

    tasks = [_classify_one(a.get("title", ""), a.get("description", "")) for a in articles]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    classified = []
    for article, result in zip(articles, results):
        if isinstance(result, Exception):
            result = {"verdict": "UNVERIFIED", "confidence": 0.0, "reason": "Error"}
        article["verdict"] = result.get("verdict", "UNVERIFIED")
        article["ai_confidence"] = result.get("confidence", 0.0)
        article["ai_reason"] = result.get("reason", "")
        classified.append(article)

    return classified
