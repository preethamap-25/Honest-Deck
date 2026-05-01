"""
Explanation generator using Groq — produces human-readable summaries.
"""
import os
import asyncio
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


def _build_context(state: dict) -> str:
    parts = [f"Input type: {state.get('input_type', 'unknown')}"]
    parts.append(f"Overall risk score: {state.get('risk_score', 0):.0%}")
    parts.append(f"Label: {state.get('label', 'UNKNOWN')}")

    if state.get("text_result"):
        r = state["text_result"]
        parts.append(f"Text verdict: {r.get('verdict', 'UNVERIFIED')}")
        parts.append(f"Text analysis: {r.get('explanation') or r.get('reasoning', '')}")
        if r.get("red_flags"):
            parts.append(f"Red flags: {', '.join(r['red_flags'])}")

    if state.get("url_result"):
        r = state["url_result"]
        parts.append(f"URL analysis: {r.get('reasoning') or ', '.join(r.get('reasons', []))}")

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
    try:
        response = await asyncio.to_thread(
            _client.chat.completions.create,
            model=_MODEL,
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
            max_tokens=300,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return f"Analysis complete. Risk score: {state.get('risk_score', 0):.0%}. Label: {state.get('label', 'UNKNOWN')}."
