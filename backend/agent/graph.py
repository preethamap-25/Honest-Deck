"""LangGraph state graph for SEETHRU agent pipeline."""

from __future__ import annotations

import datetime
import re
import time
import uuid
import asyncio
from typing import Any, Literal, TypedDict

from langgraph.graph import END, StateGraph

from db.mongo import db, save_analysis
from tools.evidence_retrieval import retrieve_evidence
from tools.image_detector import detect_image
from tools.text_classifier import classify_text
from tools.url_detector import detect_url
from utils.email_alert import send_alert_email
from utils.explainer import generate_explanation


class GraphState(TypedDict, total=False):
    input_type: str
    content: str
    mime_type: str

    routed_type: str
    text_result: dict | None
    url_result: dict | None
    image_result: dict | None
    evidence: list[dict[str, Any]]

    risk_score: float
    label: str
    verdict: str
    explanation: str
    agent_steps: list[dict[str, Any]]


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


def _detect_type(value: str) -> str:
    if re.match(r"^https?://[^\s]+$", value.strip()):
        return "url"
    return "text"


async def input_router(state: GraphState) -> GraphState:
    explicit = (state.get("input_type") or "").strip().lower()
    if explicit in {"text", "url", "image"}:
        routed = explicit
    else:
        routed = _detect_type(state.get("content", ""))

    steps = list(state.get("agent_steps", []))
    steps.append(_step("input_router", f"Detected input type: {routed}"))
    return {"routed_type": routed, "agent_steps": steps}


async def text_classifier_node(state: GraphState) -> GraphState:
    content = state.get("content", "")
    evidence = await retrieve_evidence(content)
    result = await classify_text(content, evidence=evidence)

    steps = list(state.get("agent_steps", []))
    steps.append(
        _step(
            "evidence_retrieval",
            "Fetched live web evidence",
            f"items={len(evidence)}",
        )
    )
    steps.append(
        _step(
            "groq_fact_checker",
            "Ran evidence-grounded fact check",
            f"verdict={result.get('verdict')} risk={result.get('risk_score')}",
        )
    )
    return {"text_result": result, "evidence": evidence, "agent_steps": steps}


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


async def aggregator_node(state: GraphState) -> GraphState:
    routed = state.get("routed_type", "text")
    text_result = state.get("text_result")
    url_result = state.get("url_result")
    image_result = state.get("image_result")

    if routed == "image" and image_result is None:
        image_result = await detect_image(state.get("content", ""), state.get("mime_type", "image/jpeg"))

    risk_score = 0.0
    verdict = "Safe"

    if routed == "text" and text_result:
        if "risk_score" in text_result:
            risk_score = float(text_result.get("risk_score", 0.45))
            verdict = str(text_result.get("verdict", "UNVERIFIED")).title()
        else:
            confidence = float(text_result.get("confidence", 0.5))
            if bool(text_result.get("is_fake", False)):
                risk_score = confidence
                verdict = "Fake"
            else:
                risk_score = max(0.0, 1.0 - confidence) * 0.4
                verdict = "Safe"
    elif routed == "url" and url_result:
        risk_score = float(url_result.get("risk_score", 0.0))
        verdict = "Phishing" if bool(url_result.get("is_phishing", False)) else "Safe"
    elif routed == "image" and image_result:
        risk_score = float(image_result.get("risk_score", 0.0))
        verdict = "Fake" if risk_score >= 0.6 else "Safe"

    risk_score = round(min(max(risk_score, 0.0), 1.0), 3)
    label = _label_from_score(risk_score)

    steps = list(state.get("agent_steps", []))
    steps.append(_step("aggregator", "Combined node outputs", f"risk={risk_score} label={label}"))

    return {
        "image_result": image_result,
        "risk_score": risk_score,
        "label": label,
        "verdict": verdict,
        "agent_steps": steps,
    }


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


def _route_after_input(state: GraphState) -> Literal["text_classifier", "url_detector", "aggregator"]:
    routed = state.get("routed_type", "text")
    if routed == "text":
        return "text_classifier"
    if routed == "url":
        return "url_detector"
    return "aggregator"


def _build_graph():
    graph = StateGraph(GraphState)

    graph.add_node("input_router", input_router)
    graph.add_node("text_classifier", text_classifier_node)
    graph.add_node("url_detector", url_detector_node)
    graph.add_node("aggregator", aggregator_node)
    graph.add_node("explainer", explainer_node)

    graph.set_entry_point("input_router")

    graph.add_conditional_edges(
        "input_router",
        _route_after_input,
        {
            "text_classifier": "text_classifier",
            "url_detector": "url_detector",
            "aggregator": "aggregator",
        },
    )

    graph.add_edge("text_classifier", "aggregator")
    graph.add_edge("url_detector", "aggregator")
    graph.add_edge("aggregator", "explainer")
    graph.add_edge("explainer", END)

    return graph.compile()


GRAPH = _build_graph()


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
