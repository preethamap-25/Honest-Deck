import os

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

client = QdrantClient(
    host=os.getenv("QDRANT_HOST", "localhost"),
    port=int(os.getenv("QDRANT_PORT", "6333")),
)

COLLECTION_NAME = "news_embeddings"
VECTOR_SIZE = 1024


def create_collection():
    collections = client.get_collections()
    existing = [c.name for c in collections.collections]

    if COLLECTION_NAME in existing:
        print("Collection already exists")
        return

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=VECTOR_SIZE,
            distance=Distance.COSINE,
        ),
    )
    print("Collection created")
