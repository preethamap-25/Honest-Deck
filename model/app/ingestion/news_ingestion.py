import uuid

import feedparser
from qdrant_client.models import PointStruct

from app.database.qdrant import COLLECTION_NAME, client
from app.embeddings.embedder import create_embedding

RSS_FEEDS = [
    {
        "url": "https://feeds.reuters.com/reuters/topNews",
        "source": "Reuters",
    }
]


def ingest_news(feeds=None):
    stored_count = 0

    for feed_config in feeds or RSS_FEEDS:
        feed = feedparser.parse(feed_config["url"])

        for entry in feed.entries:
            title = getattr(entry, "title", "")
            summary = getattr(entry, "summary", "")
            link = getattr(entry, "link", "")
            text = _build_document_text(title, summary)

            if not text:
                continue

            embedding = create_embedding(text)
            _store_document(
                title=title,
                content=summary,
                source=feed_config["source"],
                url=link,
                embedding=embedding,
            )
            stored_count += 1

            print(f"Stored: {title}")

    return stored_count


def _build_document_text(title, summary):
    return f"{title or ''} {summary or ''}".strip()


def _store_document(title, content, source, url, embedding):
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding,
                payload={
                    "title": title,
                    "content": content,
                    "source": source,
                    "url": url,
                },
            )
        ],
    )


if __name__ == "__main__":
    ingest_news()
