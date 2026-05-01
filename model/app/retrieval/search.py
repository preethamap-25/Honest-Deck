from app.database.qdrant import COLLECTION_NAME, client
from app.embeddings.embedder import create_embedding

SOURCE_WEIGHTS = {
    "Reuters": 0.98,
    "AP": 0.97,
    "Wikipedia": 0.75,
}


def _query_qdrant(embedding, limit):
    if hasattr(client, "query_points"):
        response = client.query_points(
            collection_name=COLLECTION_NAME,
            query=embedding,
            limit=limit,
        )
        return response.points

    return client.search(
        collection_name=COLLECTION_NAME,
        query_vector=embedding,
        limit=limit,
    )


def search_claim(claim: str, limit: int = 5):
    if not claim or not claim.strip():
        return []

    embedding = create_embedding(claim)
    results = _query_qdrant(embedding, limit)

    reranked = []
    for result in results:
        payload = result.payload or {}
        credibility = SOURCE_WEIGHTS.get(payload.get("source", ""), 0.5)
        final_score = result.score * credibility
        reranked.append((final_score, result))

    reranked.sort(reverse=True, key=lambda x: x[0])
    return reranked
