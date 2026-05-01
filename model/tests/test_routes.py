import sys
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api import routes


client = TestClient(routes.app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_verify_endpoint_returns_verdict_and_evidence(monkeypatch):
    fake_result = SimpleNamespace(
        payload={
            "title": "Evidence title",
            "content": "Evidence content",
            "source": "Reuters",
            "url": "https://example.test/evidence",
        },
        score=0.91,
    )

    monkeypatch.setattr(routes, "search_claim", lambda claim: [(0.89, fake_result)])
    monkeypatch.setattr(
        routes,
        "verify_claim",
        lambda claim, evidence: "verdict: likely true\nconfidence score: 0.8",
    )

    response = client.post("/verify", json={"claim": "  test claim  "})

    assert response.status_code == 200
    payload = response.json()
    assert payload["claim"] == "test claim"
    assert payload["verdict"].startswith("verdict: likely true")
    assert payload["evidence"][0]["source"] == "Reuters"
    assert payload["evidence"][0]["weighted_score"] == 0.89


def test_verify_image_endpoint_uses_ocr_text(monkeypatch):
    fake_ocr_module = SimpleNamespace(extract_text=lambda path: "text from image")
    monkeypatch.setitem(sys.modules, "app.utils.ocr", fake_ocr_module)
    monkeypatch.setattr(
        routes,
        "verify_text_claim",
        lambda claim: {
            "claim": claim,
            "verdict": "verdict: likely true",
            "evidence": [],
        },
    )

    response = client.post(
        "/verify-image",
        files={"file": ("claim.png", b"fake image bytes", "image/png")},
    )

    assert response.status_code == 200
    assert response.json()["claim"] == "text from image"
    assert response.json()["extracted_text"] == "text from image"
