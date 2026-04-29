"""
Shared Ollama HTTP client for all LLM-powered tools.

Uses Ollama's /api/chat endpoint (OpenAI-compatible messages format).
Falls back gracefully if Ollama is unreachable.
"""

import os
import json
import asyncio
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")


async def ollama_chat(
    messages: list[dict],
    model: Optional[str] = None,
    temperature: float = 0.1,
    timeout: float = 30,
) -> Optional[str]:
    """Send a chat-completion request to Ollama and return the assistant text.

    Returns None if Ollama is unreachable or the request fails.
    """
    payload = {
        "model": model or OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature},
    }
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "")
    except Exception:
        return None


def parse_json_response(raw: str) -> Optional[dict]:
    """Safely extract a JSON object from an LLM response string."""
    if not raw:
        return None
    text = raw.strip()
    # Strip markdown fences
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON within the text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                return None
    return None
