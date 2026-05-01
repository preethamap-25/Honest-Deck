from types import SimpleNamespace

from app.ingestion import news_ingestion


class FakeClient:
    def __init__(self):
        self.upserts = []

    def upsert(self, collection_name, points):
        self.upserts.append(
            {
                "collection_name": collection_name,
                "points": points,
            }
        )


def test_ingest_news_stores_feed_entries(monkeypatch):
    fake_client = FakeClient()
    feed = SimpleNamespace(
        entries=[
            SimpleNamespace(
                title="Verified headline",
                summary="Trusted evidence summary",
                link="https://example.test/story",
            ),
            SimpleNamespace(title="", summary="", link="https://example.test/empty"),
        ]
    )

    monkeypatch.setattr(news_ingestion, "client", fake_client)
    monkeypatch.setattr(news_ingestion.feedparser, "parse", lambda url: feed)
    monkeypatch.setattr(news_ingestion, "create_embedding", lambda text: [0.1, 0.2])

    stored = news_ingestion.ingest_news(
        [{"url": "https://example.test/rss", "source": "Reuters"}]
    )

    assert stored == 1
    assert len(fake_client.upserts) == 1
    point = fake_client.upserts[0]["points"][0]
    assert point.vector == [0.1, 0.2]
    assert point.payload["title"] == "Verified headline"
    assert point.payload["source"] == "Reuters"


def test_build_document_text_handles_missing_values():
    assert news_ingestion._build_document_text("Title", None) == "Title"
    assert news_ingestion._build_document_text(None, "Summary") == "Summary"
    assert news_ingestion._build_document_text("", "") == ""
