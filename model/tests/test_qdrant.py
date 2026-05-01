from types import SimpleNamespace

from app.database import qdrant


class FakeClient:
    def __init__(self, existing):
        self.existing = existing
        self.created = []

    def get_collections(self):
        collections = [SimpleNamespace(name=name) for name in self.existing]
        return SimpleNamespace(collections=collections)

    def create_collection(self, collection_name, vectors_config):
        self.created.append(
            {
                "collection_name": collection_name,
                "vectors_config": vectors_config,
            }
        )


def test_create_collection_skips_existing_collection(monkeypatch):
    fake_client = FakeClient(existing=[qdrant.COLLECTION_NAME])
    monkeypatch.setattr(qdrant, "client", fake_client)

    qdrant.create_collection()

    assert fake_client.created == []


def test_create_collection_creates_missing_collection(monkeypatch):
    fake_client = FakeClient(existing=[])
    monkeypatch.setattr(qdrant, "client", fake_client)

    qdrant.create_collection()

    assert fake_client.created[0]["collection_name"] == qdrant.COLLECTION_NAME
    assert fake_client.created[0]["vectors_config"].size == qdrant.VECTOR_SIZE
