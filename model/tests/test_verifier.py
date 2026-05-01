from types import SimpleNamespace

from app.reasoning import verifier


def evidence_item(source="Reuters", score=0.9, weighted_score=0.88):
    return (
        weighted_score,
        SimpleNamespace(
            score=score,
            payload={
                "title": "Verified story",
                "content": "The trusted source directly supports the claim.",
                "source": source,
                "url": "https://example.test/story",
            },
        ),
    )


def test_verify_claim_returns_unverifiable_without_evidence():
    result = verifier.verify_claim("unsupported claim", [])

    assert "verdict: unverifiable" in result
    assert "No relevant evidence" in result


def test_verify_claim_builds_rag_prompt_for_ollama(monkeypatch):
    captured = {}

    def fake_generate(prompt):
        captured["prompt"] = prompt
        return "verdict: likely true\nconfidence score: 0.7"

    monkeypatch.setattr(verifier, "LOCAL_LLM_PROVIDER", "ollama")
    monkeypatch.setattr(verifier, "_generate_with_ollama", fake_generate)

    result = verifier.verify_claim("claim under test", [evidence_item()])

    assert "verdict: likely true" in result
    assert "claim under test" in captured["prompt"]
    assert "Retrieved evidence:" in captured["prompt"]
    assert "Evidence 1" in captured["prompt"]
    assert "Reuters" in captured["prompt"]


def test_verify_claim_can_use_transformers_provider(monkeypatch):
    def fake_generator(prompt, do_sample, max_new_tokens):
        assert do_sample is False
        assert max_new_tokens == 300
        assert "claim under test" in prompt
        return [{"generated_text": "verdict: likely true"}]

    monkeypatch.setattr(verifier, "LOCAL_LLM_PROVIDER", "transformers")
    monkeypatch.setattr(verifier, "_get_text_generator", lambda: fake_generator)

    assert verifier.verify_claim("claim under test", [evidence_item()]) == "verdict: likely true"


def test_ollama_generation_posts_expected_payload(monkeypatch):
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"response": "verdict: verified true"}

    def fake_post(url, json, timeout):
        captured["url"] = url
        captured["json"] = json
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(verifier.requests, "post", fake_post)
    monkeypatch.setattr(verifier, "OLLAMA_URL", "http://localhost:11434/api/generate")
    monkeypatch.setattr(verifier, "OLLAMA_MODEL", "llama3.1:8b")

    result = verifier._generate_with_ollama("prompt")

    assert result == "verdict: verified true"
    assert captured["url"] == "http://localhost:11434/api/generate"
    assert captured["json"]["model"] == "llama3.1:8b"
    assert captured["json"]["prompt"] == "prompt"
    assert captured["json"]["stream"] is False


def test_verify_claim_falls_back_when_local_model_fails(monkeypatch):
    def fail(prompt):
        raise RuntimeError("model offline")

    monkeypatch.setattr(verifier, "LOCAL_LLM_PROVIDER", "ollama")
    monkeypatch.setattr(verifier, "_generate_with_ollama", fail)

    result = verifier.verify_claim("claim under test", [evidence_item()])

    assert "verdict: unverifiable" in result
    assert "model offline" in result
    assert "Start the configured local LLM provider" in result
