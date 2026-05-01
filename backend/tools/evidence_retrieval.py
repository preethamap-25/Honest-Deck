"""Real-time evidence retrieval for Groq fact checking."""

import asyncio
import os
from typing import List

import httpx
from dotenv import load_dotenv

load_dotenv()

TRUSTED_DOMAINS = [
    "reuters.com", "apnews.com", "bbc.com", "snopes.com",
    "factcheck.org", "politifact.com", "who.int", "cdc.gov",
]
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
NEWS_API_URL = "https://newsapi.org/v2/everything"


async def _duckduckgo_evidence(query: str, k: int) -> List[dict]:
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": 1},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    results = []

    abstract = data.get("AbstractText")
    source = data.get("AbstractSource") or "duckduckgo"
    url = data.get("AbstractURL") or ""
    if abstract:
        results.append({"snippet": abstract, "source": f"{source} {url}".strip()})

    for topic in data.get("RelatedTopics", []):
        if isinstance(topic, dict):
            text = topic.get("Text")
            first_url = topic.get("FirstURL", "")
            if text:
                src = "trusted" if any(d in first_url for d in TRUSTED_DOMAINS) else "web"
                results.append({"snippet": text, "source": f"{src} {first_url}".strip()})
        if len(results) >= k:
            break

    return results[:k]


async def _newsapi_evidence(query: str, k: int) -> List[dict]:
    if not NEWS_API_KEY:
        return []

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(
                NEWS_API_URL,
                params={
                    "q": query[:500],
                    "pageSize": k,
                    "sortBy": "publishedAt",
                    "language": "en",
                    "apiKey": NEWS_API_KEY,
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    evidence = []
    for article in data.get("articles", [])[:k]:
        title = article.get("title") or ""
        description = article.get("description") or ""
        source = article.get("source", {}).get("name") or "NewsAPI"
        url = article.get("url") or ""
        snippet = " - ".join(part for part in [title, description] if part)
        if snippet:
            evidence.append({"snippet": snippet, "source": f"{source} {url}".strip()})
    return evidence


def _dedupe(items: list[dict], limit: int) -> list[dict]:
    seen = set()
    unique = []
    for item in items:
        key = (item.get("snippet", ""), item.get("source", ""))
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
        if len(unique) >= limit:
            break
    return unique


async def retrieve_evidence(query: str, k: int = 6) -> List[dict]:
    if not query.strip():
        return []

    news_results, ddg_results = await asyncio.gather(
        _newsapi_evidence(query, k),
        _duckduckgo_evidence(query, k),
        return_exceptions=True,
    )

    combined = []
    if isinstance(news_results, list):
        combined.extend(news_results)
    if isinstance(ddg_results, list):
        combined.extend(ddg_results)
    return _dedupe(combined, k)


def retrieve_evidence_sync(query: str) -> List[dict]:
    return asyncio.run(retrieve_evidence(query))
