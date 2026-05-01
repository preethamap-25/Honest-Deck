"""Legacy compatibility wrapper for the old crew entrypoint.

The production backend uses ``agent.graph.run_graph``. This module stays small
and Groq-only so importing ``backend.agent.crew`` does not require CrewAI,
Ollama, or anything under ``model/``.
"""

from __future__ import annotations

import asyncio
import json

from tools.evidence_retrieval import retrieve_evidence
from tools.image_detector import detect_image
from tools.text_classifier import classify_text
from tools.url_detector import detect_url


def build_crew(input_type: str, content: str) -> dict:
    """Return a description of the Groq-backed tools used for this input."""
    tool_map = {
        "text": ["live evidence retrieval", "Groq fact checker"],
        "url": ["URL feature extraction", "Groq phishing analyst"],
        "image": ["Groq vision authenticity detector"],
    }
    return {
        "input_type": input_type,
        "content_preview": content[:120] if input_type != "image" else "(image)",
        "process": "langgraph-compatible sequential pipeline",
        "tools": tool_map.get(input_type, tool_map["text"]),
    }


async def _run_crew_async(input_type: str, content: str) -> dict:
    if input_type == "url":
        return await detect_url(content)
    if input_type == "image":
        return await detect_image(content)

    evidence = await retrieve_evidence(content)
    result = await classify_text(content, evidence=evidence)
    return {"text_result": result, "evidence": evidence}


def run_crew(input_type: str, content: str) -> str:
    """Run the legacy entrypoint and return a JSON string result."""
    result = asyncio.run(_run_crew_async(input_type, content))
    return json.dumps(result, default=str)
