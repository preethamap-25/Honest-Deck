"""
LangChain Agentic Fact-Checker
================================
Replaces the single Groq call with a full ReAct agent.

The agent has 4 tools it autonomously decides when to call:
  1. web_search          — DuckDuckGo (free, no API key)
  2. fetch_article       — Scrape and read a URL
  3. check_prior_verdicts — Query MongoDB for similar past verdicts
  4. produce_verdict     — Finalise structured JSON verdict (ends the loop)

Flow: Claim → Agent thinks → calls tools in any order/loop → produce_verdict
"""

import json
import logging
import asyncio
import re
from datetime import datetime, timezone
from typing import Optional

from langchain_groq import ChatGroq
from langchain_classic.agents import AgentExecutor, create_react_agent
from langchain.tools import tool
from langchain_core.prompts import PromptTemplate
from langchain_community.tools import DuckDuckGoSearchRun

from app.core.config import settings

logger = logging.getLogger(__name__)

# Per-invocation verdict bucket — filled by produce_verdict tool
_verdict_store: dict = {}


# ── LLM ──────────────────────────────────────────────────────────────────────

def _get_llm() -> ChatGroq:
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=settings.GROQ_MODEL,
        temperature=settings.GROQ_TEMPERATURE,
        max_tokens=settings.GROQ_MAX_TOKENS,
    )


# ── Tools ─────────────────────────────────────────────────────────────────────

@tool
def web_search(query: str) -> str:
    """Search the web for information about a claim.
    Use for finding news, fact-checks, scientific studies, or public records.
    Input: short search query (3-10 words).
    Returns: top result snippets."""
    try:
        results = DuckDuckGoSearchRun().run(query)
        return results[:3000] if results else "No results found."
    except Exception as e:
        logger.warning(f"web_search error: {e}")
        return f"Search unavailable: {e}"


@tool
def fetch_article(url: str) -> str:
    """Fetch and read the main text content from a URL.
    Use when you have a specific article or source to read in full.
    Input: full URL (http:// or https://).
    Returns: extracted article text."""
    try:
        from bs4 import BeautifulSoup
        import httpx

        with httpx.Client(timeout=10, follow_redirects=True,
                          headers={"User-Agent": "FactCheck-Bot/1.0"}) as client:
            resp = client.get(url)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        main = soup.find("article") or soup.find("main") or soup.find("body")
        text = main.get_text(separator=" ", strip=True) if main else soup.get_text()
        text = re.sub(r"\s+", " ", text).strip()
        return text[:2000] if text else "Could not extract content."
    except Exception as e:
        logger.warning(f"fetch_article error for {url}: {e}")
        return f"Could not fetch: {e}"


@tool
def check_prior_verdicts(claim_text: str) -> str:
    """Check if this or a similar claim was already fact-checked in our database.
    Input: claim text or key phrases.
    Returns: prior verdict summary or 'No prior verdicts found.'"""
    try:
        from app.core.database import get_db
        db = get_db()
        if db is None:
            return "Database not available."

        async def _query():
            results = []
            cursor = db.verdicts.find(
                {"$text": {"$search": claim_text}},
                {"score": {"$meta": "textScore"}},
            ).sort([("score", {"$meta": "textScore"})]).limit(3)
            async for doc in cursor:
                if doc.get("score", 0) > 3.0:
                    results.append(
                        f"- Label: {doc.get('label')} | "
                        f"Confidence: {doc.get('confidence', 0):.2f} | "
                        f"{doc.get('explanation', '')[:200]}"
                    )
            return results

        try:
            loop = asyncio.get_event_loop()
            results = loop.run_until_complete(_query())
        except RuntimeError:
            results = asyncio.run(_query())

        return ("Prior verdicts:\n" + "\n".join(results)) if results else "No prior verdicts found."
    except Exception as e:
        logger.warning(f"check_prior_verdicts error: {e}")
        return f"Could not query database: {e}"


@tool
def produce_verdict(verdict_json: str) -> str:
    """Call this ONCE when you have enough evidence to deliver your final verdict.
    Input: JSON string with keys: label, confidence, explanation, reasoning_steps,
           evidence (list of {source, excerpt, relevance_score, supports_claim}),
           key_entities, suggested_sources.
    Label must be one of: true | false | misleading | partially_true | unverifiable"""
    global _verdict_store
    try:
        clean = verdict_json.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        clean = clean.strip()

        data = json.loads(clean)

        valid_labels = {"true", "false", "misleading", "partially_true", "unverifiable"}
        label = data.get("label", "unverifiable").lower().strip()
        if label not in valid_labels:
            label = "unverifiable"

        confidence = max(0.0, min(1.0, float(data.get("confidence", 0.5))))

        evidence = []
        for item in data.get("evidence", []):
            try:
                evidence.append({
                    "source": str(item.get("source", "unknown")),
                    "excerpt": str(item.get("excerpt", ""))[:500],
                    "relevance_score": float(item.get("relevance_score", 0.5)),
                    "supports_claim": bool(item.get("supports_claim", False)),
                })
            except Exception:
                continue

        _verdict_store["latest"] = {
            "label": label,
            "confidence": confidence,
            "explanation": str(data.get("explanation", "No explanation.")),
            "reasoning_steps": data.get("reasoning_steps", []),
            "evidence": evidence,
            "key_entities": data.get("key_entities", []),
            "suggested_sources": data.get("suggested_sources", []),
            "model_used": settings.GROQ_MODEL,
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }
        return f"Verdict recorded: {label} (confidence={confidence:.2f})"

    except json.JSONDecodeError as e:
        return f"Invalid JSON: {e}. Fix and call produce_verdict again."
    except Exception as e:
        return f"Error recording verdict: {e}"


# ── Agent prompt ──────────────────────────────────────────────────────────────

AGENT_PROMPT = PromptTemplate.from_template("""You are an expert fact-checker. Investigate the claim below using the available tools, then deliver a verdict.

Available tools:
{tools}

PROCESS:
1. check_prior_verdicts — see if already fact-checked
2. web_search — search 2-3 targeted queries for evidence
3. fetch_article — read key source URLs in detail
4. produce_verdict — call ONCE with your final JSON verdict

RULES:
- Always run at least one web_search before concluding
- Cross-reference 2+ sources for high confidence (>0.8)
- Conflicting sources = lower confidence score
- Never fabricate quotes or sources
- produce_verdict must be called exactly once

Claim: {claim}
{context_block}

Format:
Thought: what should I do next and why
Action: tool name (one of [{tool_names}])
Action Input: input to the tool
Observation: result
... repeat as needed ...
Thought: I have sufficient evidence
Action: produce_verdict
Action Input: {{"label": "...", "confidence": 0.0, "explanation": "...", "reasoning_steps": [], "evidence": [], "key_entities": [], "suggested_sources": []}}
Observation: Verdict recorded
Final Answer: Investigation complete.

{agent_scratchpad}""")


# ── Main entry point ──────────────────────────────────────────────────────────

async def verify_claim(
    claim_text: str,
    context: Optional[str] = None,
    source_url: Optional[str] = None,
    language: str = "en",
    retries: int = 1,
) -> dict:
    """Run the LangChain ReAct agent to fact-check a claim."""
    global _verdict_store

    if not settings.GROQ_API_KEY:
        return _stub_verdict(claim_text, "GROQ_API_KEY not configured")

    context_parts = []
    if context:
        context_parts.append(f"Context: {context}")
    if source_url:
        context_parts.append(f"Source URL: {source_url}")
    if language != "en":
        context_parts.append(
            f"Note: Claim is in '{language}'. Return JSON fields in English."
        )
    context_block = "\n".join(context_parts)

    tools = [web_search, fetch_article, check_prior_verdicts, produce_verdict]
    agent = create_react_agent(llm=_get_llm(), tools=tools, prompt=AGENT_PROMPT)
    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        max_iterations=8,
        handle_parsing_errors=True,
        early_stopping_method="generate",
    )

    for attempt in range(retries + 1):
        _verdict_store.clear()
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: executor.invoke({
                    "claim": claim_text,
                    "context_block": context_block,
                })
            )

            verdict = _verdict_store.get("latest")
            if verdict:
                logger.info(f"Agent verdict: {verdict['label']} (confidence={verdict['confidence']:.2f})")
                return verdict

            logger.warning(f"Agent did not call produce_verdict (attempt {attempt+1})")

        except Exception as e:
            logger.error(f"Agent error attempt {attempt+1}: {e}", exc_info=True)
            if attempt < retries:
                await asyncio.sleep(2 ** attempt)

    return _stub_verdict(claim_text, "Agent failed to produce a verdict after retries")


def _stub_verdict(claim_text: str, reason: str = "") -> dict:
    return {
        "label": "unverifiable",
        "confidence": 0.0,
        "explanation": f"Automated verification unavailable. {reason}".strip(),
        "reasoning_steps": [],
        "evidence": [],
        "key_entities": [],
        "suggested_sources": [],
        "model_used": "none",
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "requires_human_review": True,
    }