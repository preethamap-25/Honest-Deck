import os
from functools import lru_cache


MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-large-en-v1.5")


@lru_cache(maxsize=1)
def get_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(MODEL_NAME)


def create_embedding(text: str):
    if not text or not text.strip():
        raise ValueError("Cannot create an embedding for empty text.")

    embedding = get_model().encode(text)
    return embedding.tolist()
