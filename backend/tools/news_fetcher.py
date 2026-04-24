"""
News fetcher using NewsAPI.
Fetches live — no MongoDB caching (ephemeral data).
"""
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
NEWS_API_URL = "https://newsapi.org/v2/everything"


async def fetch_news(category: str = "latest news", page_size: int = 10) -> list:
    if not NEWS_API_KEY:
        return []

    params = {
        "q": category,
        "pageSize": page_size,
        "sortBy": "publishedAt",
        "language": "en",
        "apiKey": NEWS_API_KEY,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(NEWS_API_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    articles = data.get("articles", [])
    return [
        {
            "title": a.get("title"),
            "description": a.get("description"),
            "url": a.get("url"),
            "source": {"name": a.get("source", {}).get("name", "Unknown")},
            "urlToImage": a.get("urlToImage"),
            "published_at": a.get("publishedAt"),
        }
        for a in articles
    ]
