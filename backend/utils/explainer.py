"""
Explanation generator using Ollama — produces human-readable summaries.
"""
from utils.ollama_client import ollama_chat


def _build_context(state: dict) -> str:
    parts = [f"Input type: {state.get('input_type', 'unknown')}"]
    parts.append(f"Overall risk score: {state.get('risk_score', 0):.0%}")
    parts.append(f"Label: {state.get('label', 'UNKNOWN')}")

    if state.get("text_result"):
        r = state["text_result"]
        parts.append(f"Text analysis: {r.get('reasoning', '') or r.get('explanation', '')}")
        if r.get("red_flags"):
            parts.append(f"Red flags: {', '.join(r['red_flags'])}")

    if state.get("url_result"):
        r = state["url_result"]
        parts.append(f"URL analysis: {r.get('reasoning', '')}")
        if r.get("reasons"):
            parts.append(f"Reasons: {', '.join(r['reasons'][:5])}")

    if state.get("image_result"):
        r = state["image_result"]
        parts.append(f"Image analysis: {r.get('reasoning', '')}")
        if r.get("artifacts"):
            parts.append(f"Artifacts: {', '.join(r['artifacts'])}")

    if state.get("evidence"):
        snippets = [e.get("snippet", "") for e in state["evidence"][:3]]
        parts.append(f"Supporting evidence: {' | '.join(snippets)}")

    return "\n".join(parts)


async def generate_explanation(state: dict) -> str:
    context = _build_context(state)
    raw = await ollama_chat(
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a clear, concise AI assistant explaining a misinformation "
                    "detection result to a non-technical user. Write a 2-3 sentence "
                    "plain-English explanation of why this content was flagged and what "
                    "the user should do."
                ),
            },
            {"role": "user", "content": context},
        ],
        temperature=0.3,
        timeout=30,
    )
    if raw and raw.strip():
        return raw.strip()
    return f"Analysis complete. Risk score: {state.get('risk_score', 0):.0%}. Label: {state.get('label', 'UNKNOWN')}."
