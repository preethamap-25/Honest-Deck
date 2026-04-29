"""
LangGraph state graph for SEETHRU agent pipeline.

Architecture layers implemented:
  1. Input Layer      — preprocessor_node  (normalize, validate, extract metadata)
  2. Central Agent    — input_router       (dynamic routing via conditional edges)
  3. Verification     — text_classifier, url_detector, image_detector, evidence_retrieval
  4. Reasoning        — aggregator         (conflict resolution + risk scoring)
  5. Explanation      — explainer          (human-readable summary with evidence)
"""

from __future__ import annotations

import datetime
import re
import time
import uuid
import asyncio
from typing import Any, Literal, TypedDict

from langgraph.graph import END, StateGraph

from db.mongo import db, save_analysis
from tools.image_detector import detect_image
from tools.text_classifier import classify_text
from tools.url_detector import detect_url
from tools.evidence_retrieval import retrieve_evidence
from tools.preprocessor import preprocess
from utils.email_alert import send_alert_email
from utils.explainer import generate_explanation


# ── State schema ────────────────────────────────────────────────────────────

class GraphState(TypedDict, total=False):
    # raw inputs
    input_type: str
    content: str
    mime_type: str

    # after preprocessing
    routed_type: str
    metadata: dict

    # tool results
    text_result: dict | None
    url_result: dict | None
    image_result: dict | None
    evidence: list[dict]

    # aggregated output
    risk_score: float
    label: str
    verdict: str
    explanation: str
    agent_steps: list[dict[str, Any]]


# ── Helpers ─────────────────────────────────────────────────────────────────

def _step(agent: str, action: str, detail: str = "") -> dict[str, Any]:
    return {
        "agent": agent,
        "action": action,
        "status": "done",
        "detail": detail,
        "ts": time.time(),
    }


def _label_from_score(score: float) -> str:
    if score >= 0.75:
        return "HIGH RISK"
    if score >= 0.45:
        return "SUSPICIOUS"
    return "SAFE"


# ── Layer 1: Input Preprocessing ────────────────────────────────────────────

async def preprocessor_node(state: GraphState) -> GraphState:
    """Normalize input, detect type, extract metadata."""
    raw_content = state.get("content", "")
    explicit_type = (state.get("input_type") or "").strip().lower() or None

    pp = preprocess(raw_content, explicit_type)

    routed = pp["input_type"]
    steps = list(state.get("agent_steps", []))
    steps.append(
        _step(
            "preprocessor",
            f"Preprocessed input — type: {routed}",
            f"chars={pp['metadata'].get('char_count', 0)}",
        )
    )
    return {
        "content": pp["content"],
        "routed_type": routed,
        "metadata": pp["metadata"],
        "agent_steps": steps,
    }


# ── Layer 3: Verification Tool Nodes ───────────────────────────────────────

async def text_classifier_node(state: GraphState) -> GraphState:
    result = await classify_text(state.get("content", ""))
    steps = list(state.get("agent_steps", []))
    steps.append(
        _step(
            "text_classifier",
            "Ran misinformation classifier",
            f"is_fake={result.get('is_fake')} confidence={result.get('confidence')}",
        )
    )
    return {"text_result": result, "agent_steps": steps}


async def url_detector_node(state: GraphState) -> GraphState:
    result = await detect_url(state.get("content", ""))
    steps = list(state.get("agent_steps", []))
    steps.append(
        _step(
            "url_detector",
            "Evaluated phishing risk",
            f"is_phishing={result.get('is_phishing')} risk={result.get('risk_score')}",
        )
    )
    return {"url_result": result, "agent_steps": steps}


async def image_detector_node(state: GraphState) -> GraphState:
    """Dedicated image detection node (was previously inside aggregator)."""
    result = await detect_image(
        state.get("content", ""),
        state.get("mime_type", "image/jpeg"),
    )
    steps = list(state.get("agent_steps", []))
    steps.append(
        _step(
            "image_detector",
            "Analyzed image authenticity",
            f"label={result.get('label')} risk={result.get('risk_score')}",
        )
    )
    return {"image_result": result, "agent_steps": steps}


async def evidence_node(state: GraphState) -> GraphState:
    """Cross-reference claims with trusted sources via DuckDuckGo."""
    routed = state.get("routed_type", "text")
    content = state.get("content", "")

    # Build a search query from the content
    if routed == "text":
        query = content[:200]
    elif routed == "url":
        query = content
    else:
        # For images, use any text_result explanation as query
        tr = state.get("text_result") or {}
        query = tr.get("explanation", "")[:200]

    evidence = []
    if query.strip():
        try:
            evidence = await asyncio.wait_for(
                retrieve_evidence(query, k=5),
                timeout=12,
            )
        except Exception:
            evidence = [{"snippet": "Evidence retrieval timed out", "source": "error"}]

    steps = list(state.get("agent_steps", []))
    steps.append(
        _step("evidence_retrieval", "Fetched supporting evidence", f"found={len(evidence)} items")
    )
    return {"evidence": evidence, "agent_steps": steps}


# ── Layer 4: Reasoning — Aggregator with Conflict Resolution ───────────────

async def aggregator_node(state: GraphState) -> GraphState:
    routed = state.get("routed_type", "text")
    text_result = state.get("text_result")
    url_result = state.get("url_result")
    image_result = state.get("image_result")
    evidence = state.get("evidence", [])

    risk_score = 0.0
    verdict = "Safe"

    if routed == "text" and text_result:
        confidence = float(text_result.get("confidence", 0.5))
        if bool(text_result.get("is_fake", False)):
            risk_score = confidence
            verdict = "Fake"
        else:
            risk_score = max(0.0, 1.0 - confidence) * 0.4
            verdict = "Safe"

        # Conflict resolution: if evidence from trusted sources contradicts
        trusted_count = sum(1 for e in evidence if "trusted" in e.get("source", ""))
        if trusted_count > 0 and text_result.get("is_fake"):
            # Trusted sources found — slightly lower confidence in fake verdict
            risk_score = max(0.0, risk_score - 0.1)
        elif trusted_count == 0 and text_result.get("is_fake"):
            # No trusted sources to corroborate — boost risk slightly
            risk_score = min(1.0, risk_score + 0.05)

    elif routed == "url" and url_result:
        risk_score = float(url_result.get("risk_score", 0.0))
        verdict = "Phishing" if bool(url_result.get("is_phishing", False)) else "Safe"

    elif routed == "image" and image_result:
        risk_score = float(image_result.get("risk_score", 0.0))
        verdict = "Fake" if risk_score >= 0.6 else "Safe"

    risk_score = round(min(max(risk_score, 0.0), 1.0), 3)
    label = _label_from_score(risk_score)

    steps = list(state.get("agent_steps", []))
    steps.append(_step("aggregator", "Combined & resolved tool outputs", f"risk={risk_score} label={label}"))

    return {
        "risk_score": risk_score,
        "label": label,
        "verdict": verdict,
        "agent_steps": steps,
    }


# ── Layer 4b: Explainer ────────────────────────────────────────────────────

async def explainer_node(state: GraphState) -> GraphState:
    try:
        explanation = await asyncio.wait_for(
            generate_explanation(
                {
                    "input_type": state.get("routed_type", "unknown"),
                    "risk_score": state.get("risk_score", 0.0),
                    "label": state.get("label", "SAFE"),
                    "text_result": state.get("text_result"),
                    "url_result": state.get("url_result"),
                    "image_result": state.get("image_result"),
                    "evidence": state.get("evidence", []),
                }
            ),
            timeout=20,
        )
    except Exception:
        explanation = (
            f"Analysis complete. Risk score {int(float(state.get('risk_score', 0.0)) * 100)}%. "
            f"Label: {state.get('label', 'SAFE')}."
        )
    steps = list(state.get("agent_steps", []))
    steps.append(_step("explainer", "Generated human-readable explanation"))
    return {"explanation": explanation, "agent_steps": steps}


# ── Routing Logic ──────────────────────────────────────────────────────────

def _route_after_preprocessor(
    state: GraphState,
) -> Literal["text_classifier", "url_detector", "image_detector"]:
    routed = state.get("routed_type", "text")
    if routed == "url":
        return "url_detector"
    if routed == "image":
        return "image_detector"
    return "text_classifier"


# ── Graph Construction ─────────────────────────────────────────────────────

def _build_graph():
    graph = StateGraph(GraphState)

    # Layer 1 — Input
    graph.add_node("preprocessor", preprocessor_node)

    # Layer 3 — Verification tools
    graph.add_node("text_classifier", text_classifier_node)
    graph.add_node("url_detector", url_detector_node)
    graph.add_node("image_detector", image_detector_node)
    graph.add_node("evidence_retrieval", evidence_node)

    # Layer 4 — Reasoning
    graph.add_node("aggregator", aggregator_node)
    graph.add_node("explainer", explainer_node)

    # Entry point
    graph.set_entry_point("preprocessor")

    # Route from preprocessor to the right verification tool
    graph.add_conditional_edges(
        "preprocessor",
        _route_after_preprocessor,
        {
            "text_classifier": "text_classifier",
            "url_detector": "url_detector",
            "image_detector": "image_detector",
        },
    )

    # After each verification tool → evidence retrieval
    graph.add_edge("text_classifier", "evidence_retrieval")
    graph.add_edge("url_detector", "evidence_retrieval")
    graph.add_edge("image_detector", "evidence_retrieval")

    # Evidence → Aggregator → Explainer → END
    graph.add_edge("evidence_retrieval", "aggregator")
    graph.add_edge("aggregator", "explainer")
    graph.add_edge("explainer", END)

    return graph.compile()


GRAPH = _build_graph()


# ── Public API ─────────────────────────────────────────────────────────────

async def run_graph(input_type: str, content: str, mime_type: str = "image/jpeg", session_id: str = "") -> dict:
    state: GraphState = {
        "input_type": input_type,
        "content": content,
        "mime_type": mime_type,
        "agent_steps": [],
    }
    result = await GRAPH.ainvoke(state)

    risk_score = float(result.get("risk_score", 0.0))
    alert_triggered = risk_score >= 0.75

    output = {
        "input_type": result.get("routed_type", input_type),
        "risk_score": risk_score,
        "label": result.get("label", "SAFE"),
        "verdict": result.get("verdict", "Safe"),
        "explanation": result.get("explanation", "Analysis complete."),
        "text_result": result.get("text_result"),
        "url_result": result.get("url_result"),
        "image_result": result.get("image_result"),
        "evidence": result.get("evidence", []),
        "alert_triggered": alert_triggered,
        "agent_steps": result.get("agent_steps", []),
    }

    try:
        await asyncio.wait_for(
            save_analysis(
                {
                    "analysis_id": str(uuid.uuid4()),
                    "session_id": session_id,
                    "content_preview": content[:120] if output["input_type"] != "image" else "(image)",
                    **output,
                }
            ),
            timeout=3,
        )

        if alert_triggered:
            alert_doc = {
                "alert_id": str(uuid.uuid4()),
                "input_type": output["input_type"],
                "label": output["label"],
                "risk_score": output["risk_score"],
                "explanation": output["explanation"],
                "timestamp": datetime.datetime.utcnow(),
            }
            await asyncio.wait_for(db["alerts"].insert_one(alert_doc), timeout=3)
            await asyncio.wait_for(send_alert_email(alert_doc), timeout=5)
    except Exception:
        pass

    return output
