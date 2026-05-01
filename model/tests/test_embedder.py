from app.embeddings import embedder


class FakeEmbedding:
    def tolist(self):
        return [0.1, 0.2, 0.3]


class FakeModel:
    def encode(self, text):
        assert text == "verified claim"
        return FakeEmbedding()


def test_create_embedding_uses_cached_model(monkeypatch):
    monkeypatch.setattr(embedder, "get_model", lambda: FakeModel())

    assert embedder.create_embedding("verified claim") == [0.1, 0.2, 0.3]


def test_create_embedding_rejects_empty_text():
    try:
        embedder.create_embedding("   ")
    except ValueError as exc:
        assert "empty text" in str(exc)
    else:
        raise AssertionError("Expected ValueError for empty text.")
