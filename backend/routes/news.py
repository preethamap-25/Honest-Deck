from fastapi import APIRouter
from tools.news_fetcher import fetch_news
from tools.news_classifier import classify_articles

router = APIRouter()


@router.get("/")
async def get_news(category: str = "latest news", page_size: int = 10):
    try:
        articles = await fetch_news(category=category, page_size=page_size)
        classified = await classify_articles(articles)
        return {"articles": classified, "count": len(classified)}
    except Exception:
        return {"articles": [], "count": 0}
