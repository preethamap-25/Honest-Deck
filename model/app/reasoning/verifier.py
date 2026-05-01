import os
from functools import lru_cache

import requests
from dotenv import load_dotenv

load_dotenv()

LOCAL_LLM_PROVIDER = os.getenv("LOCAL_LLM_PROVIDER", "ollama").lower()
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
HF_GENERATION_MODEL = os.getenv("HF_GENERATION_MODEL", "google/flan-t5-base")
MAX_EVIDENCE_ITEMS = int(os.getenv("MAX_EVIDENCE_ITEMS", "5"))
MAX_EVIDENCE_CHARS = int(os.getenv("MAX_EVIDENCE_CHARS", "5000"))


def verify_claim(claim, evidence):
    evidence_items = _format_evidence(evidence)

    if not evidence_items:
        return _unverifiable("No relevant evidence was found in the indexed sources.")

    prompt = _build_rag_prompt(claim, evidence_items)

    try:
        if LOCAL_LLM_PROVIDER == "transformers":
            return _generate_with_transformers(prompt)
        return _generate_with_ollama(prompt)
    except Exception as exc:
        return _fallback_verdict(claim, evidence_items, exc)


def _format_evidence(evidence):
    formatted = []

    for index, (weighted_score, result) in enumerate(evidence[:MAX_EVIDENCE_ITEMS], start=1):
        payload = result.payload or {}
        content = payload.get("content", "").strip()
        title = payload.get("title", "").strip()

        if not content and not title:
            continue

        source = payload.get("source", "unknown source")
        url = payload.get("url", "")
        formatted.append(
            {
                "id": index,
                "title": title,
                "content": content,
                "source": source,
                "url": url,
                "similarity_score": round(float(result.score), 4),
                "weighted_score": round(float(weighted_score), 4),
            }
        )

    return formatted


def _build_rag_prompt(claim, evidence_items):
    evidence_text = "\n\n".join(
        (
            f"Evidence {item['id']}\n"
            f"Source: {item['source']}\n"
            f"Title: {item['title']}\n"
            f"URL: {item['url']}\n"
            f"Retrieval score: {item['weighted_score']}\n"
            f"Content: {item['content']}"
        )
        for item in evidence_items
    )[:MAX_EVIDENCE_CHARS]

    return f"""
You are Honest Deck, a local retrieval-augmented fact verification system.

Your job is to judge the claim using only the evidence below. Do not use outside
knowledge. If the evidence is weak, unrelated, missing key dates, or does not
directly support or contradict the claim, choose "unverifiable".

Allowed verdict labels:
- verified true
- likely true
- misleading
- false
- unverifiable

Claim:
{claim}

Retrieved evidence:
{evidence_text}

Return exactly this format:
verdict: <one allowed label>
confidence score: <0.0 to 1.0>
reasoning: <short explanation grounded in the evidence>
supporting evidence: <cite evidence numbers and source names>
limitations: <what is missing or uncertain>
""".strip()


def _generate_with_ollama(prompt):
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,
                "num_predict": 350,
            },
        },
        timeout=120,
    )
    response.raise_for_status()
    return response.json()["response"].strip()


@lru_cache(maxsize=1)
def _get_text_generator():
    from transformers import pipeline

    return pipeline(
        "text2text-generation",
        model=HF_GENERATION_MODEL,
    )


def _generate_with_transformers(prompt):
    generator = _get_text_generator()
    response = generator(prompt, do_sample=False, max_new_tokens=300)
    return response[0]["generated_text"].strip()


def _unverifiable(reason):
    return (
        "verdict: unverifiable\n"
        "confidence score: 0.0\n"
        f"reasoning: {reason}\n"
        "supporting evidence: none\n"
        "limitations: Add more trusted source documents to the local index."
    )


def _fallback_verdict(claim, evidence_items, error):
    top_evidence = evidence_items[0]
    score = top_evidence["weighted_score"]

    if score < 0.35:
        return _unverifiable(
            "The local reasoning model was unavailable and retrieved evidence was too weak."
        )

    return (
        "verdict: unverifiable\n"
        "confidence score: 0.2\n"
        "reasoning: The retriever found potentially related evidence, but the local "
        f"reasoning model failed before it could verify the claim. Error: {error}\n"
        f"supporting evidence: Evidence {top_evidence['id']} from {top_evidence['source']} "
        f"appears related to the claim: {claim}\n"
        "limitations: Start the configured local LLM provider or switch LOCAL_LLM_PROVIDER."
    )
