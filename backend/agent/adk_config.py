"""Groq runtime configuration for SEETHRU.

The filename is kept for backward compatibility with older imports, but the
backend no longer uses Google ADK/Gemini.
"""

import os

from dotenv import load_dotenv

load_dotenv()

GROQ_CONFIG = {
    "text_model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip(),
    "vision_model": os.getenv(
        "GROQ_VISION_MODEL",
        "meta-llama/llama-4-scout-17b-16e-instruct",
    ).strip(),
    "temperature": float(os.getenv("GROQ_TEMPERATURE", "0.1")),
    "max_output_tokens": int(os.getenv("GROQ_MAX_TOKENS", "1024")),
}

# Backward-compatible alias for any older code importing ADK_CONFIG.
ADK_CONFIG = GROQ_CONFIG
