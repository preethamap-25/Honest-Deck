"""
Lightweight evidence retrieval using DuckDuckGo instant answer API.
"""
import asyncio
from typing import List
import httpx

TRUSTED_DOMAINS = [
    "reuters.com", "apnews.com", "bbc.com", "snopes.com",
    "factcheck.org", "politifact.com", "who.int", "cdc.gov",
]


async def retrieve_evidence(query: str, k: int = 5) -> List[dict]:
    if not query.strip():
        return []

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": 1},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        return [{"snippet": f"Evidence retrieval failed: {str(e)}", "source": "error"}]

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


def retrieve_evidence_sync(query: str) -> List[dict]:
    return asyncio.get_event_loop().run_until_complete(retrieve_evidence(query))
