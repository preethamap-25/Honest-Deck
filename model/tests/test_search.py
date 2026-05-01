from types import SimpleNamespace

from app.retrieval import search


def point(source, score):
    return SimpleNamespace(
        payload={"source": source, "title": source, "content": "evidence"},
        score=score,
    )


def test_search_claim_reranks_by_similarity_and_source_weight(monkeypatch):
    results = [
        point("Unknown Blog", 1.0),
        point("Reuters", 0.9),
    ]

    class FakeClient:
        def query_points(self, collection_name, query, limit):
            assert collection_name == search.COLLECTION_NAME
            assert query == [0.1, 0.2]
            assert limit == 5
            return SimpleNamespace(points=results)

    monkeypatch.setattr(search, "client", FakeClient())
    monkeypatch.setattr(search, "create_embedding", lambda claim: [0.1, 0.2])

    reranked = search.search_claim("test claim")

    assert reranked[0][1].payload["source"] == "Reuters"
    assert reranked[0][0] == 0.9 * search.SOURCE_WEIGHTS["Reuters"]
    assert reranked[1][1].payload["source"] == "Unknown Blog"


def test_query_qdrant_supports_legacy_search_client(monkeypatch):
    expected = [point("AP", 0.8)]

    class LegacyClient:
        def search(self, collection_name, query_vector, limit):
            assert query_vector == [0.3]
            return expected

    monkeypatch.setattr(search, "client", LegacyClient())

    assert search._query_qdrant([0.3], 3) == expected


def test_search_claim_returns_no_results_for_empty_claim():
    assert search.search_claim("   ") == []
