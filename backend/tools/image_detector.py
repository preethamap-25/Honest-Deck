"""
Image authenticity detector using Groq Vision API.
Detects AI-generated or manipulated images.
"""
import os
import json
import asyncio
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

_client = Groq(api_key=os.getenv("GROQ_API_KEY", "").strip())
_VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct").strip()

_VISION_PROMPT = """You are an expert digital forensics analyst specializing in
detecting AI-generated images, deepfakes, and photo manipulations.
You are one of the AI agents in the SEETHRU agentic pipeline.

Analyze the provided image and return ONLY a valid JSON object with EXACTLY these fields:
{
  "risk_score": <float 0.0-1.0>,
  "label": "<AUTHENTIC|SUSPICIOUS|AI_GENERATED|MANIPULATED>",
  "reasoning": "<one-paragraph forensic analysis>",
  "artifacts": ["<artifact1>", "<artifact2>"],
  "confidence": <float 0.0-1.0>
}

Look for: unnatural lighting, inconsistent shadows, blurred edges, GAN artifacts,
metadata anomalies, and visual inconsistencies. Return ONLY the JSON, no markdown."""


async def detect_image(image_b64: str, mime_type: str = "image/jpeg") -> dict:
    try:
        response = await asyncio.to_thread(
            _client.chat.completions.create,
            model=_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": _VISION_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_b64}",
                            },
                        },
                    ],
                }
            ],
            temperature=0.1,
            max_tokens=1024,
        )
        raw = response.choices[0].message.content.strip()
    except Exception:
        return {
            "risk_score": 0.45,
            "label": "SUSPICIOUS",
            "reasoning": "Groq vision analysis is unavailable at the moment.",
            "artifacts": [],
            "confidence": 0.0,
        }

    try:
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(raw)
    except (json.JSONDecodeError, IndexError):
        return {
            "risk_score": 0.5,
            "label": "SUSPICIOUS",
            "reasoning": raw,
            "artifacts": [],
            "confidence": 0.5,
        }


def detect_image_sync(image_b64: str, mime_type: str = "image/jpeg") -> dict:
    return asyncio.get_event_loop().run_until_complete(
        detect_image(image_b64, mime_type)
    )
