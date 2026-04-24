"""
Google ADK (Agent Development Kit) configuration for SEETHRU.
"""
import os
from dotenv import load_dotenv

load_dotenv()

ADK_CONFIG = {
    "project_id": os.getenv("GOOGLE_CLOUD_PROJECT", ""),
    "location": os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"),
    "gemini_model": os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
    "gemini_vision_model": os.getenv("GEMINI_VISION_MODEL", "gemini-2.0-flash"),
    "temperature": float(os.getenv("GEMINI_TEMPERATURE", "0.2")),
    "max_output_tokens": int(os.getenv("GEMINI_MAX_TOKENS", "2048")),
}
