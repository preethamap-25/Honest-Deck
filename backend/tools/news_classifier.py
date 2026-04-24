"""
News article classifier — classifies fetched articles as REAL or FAKE using Groq.
"""
import os
import json
import asyncio
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

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
    try:
        response = await asyncio.to_thread(
            _client.chat.completions.create,
            model=_MODEL,
            messages=[
                {"role": "system", "content": _CLASSIFY_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0.1,
            max_tokens=200,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(raw)
    except Exception:
        return {"verdict": "UNVERIFIED", "confidence": 0.0, "reason": "Classification unavailable"}


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
