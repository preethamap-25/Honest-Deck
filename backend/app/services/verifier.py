"""
LangChain Agentic Fact-Checker (SeeThru Central Agent)
========================================================
A dynamic ReAct agent that autonomously orchestrates verification tools
based on input type detection (text, URL, image).

The agent has 6 tools it autonomously decides when to call:
  1. web_search           — DuckDuckGo (free, no API key)
  2. fetch_article        — Scrape and read a URL
  3. check_prior_verdicts — Query MongoDB for similar past verdicts
  4. analyze_url_safety   — Phishing/malicious URL detection
  5. analyze_text_patterns — Linguistic/psycholinguistic fake news detection
  6. produce_verdict      — Finalise structured JSON verdict (ends the loop)

Flow: Input → Agent detects type → dynamically selects tools → produce_verdict
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
        timeout=settings.GROQ_REQUEST_TIMEOUT,
        max_retries=settings.GROQ_MAX_RETRIES,
    )


def _get_fallback_models() -> list:
    return [m.strip() for m in settings.GROQ_FALLBACK_MODELS.split(",") if m.strip()]


# ── Tools ─────────────────────────────────────────────────────────────────────

@tool
def web_search(query: str) -> str:
    """Search the web for information about a claim.
    Use for finding news, fact-checks, scientific studies, or public records.
    Input: short search query (3-10 words).
    Returns: top result snippets."""
    try:
        results = DuckDuckGoSearchRun().run(query)
        return results[:settings.WEB_SEARCH_MAX_CHARS] if results else "No results found."
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

        with httpx.Client(timeout=settings.HTTP_TIMEOUT, follow_redirects=True,
                          headers={"User-Agent": settings.USER_AGENT}) as client:
            resp = client.get(url)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        main = soup.find("article") or soup.find("main") or soup.find("body")
        text = main.get_text(separator=" ", strip=True) if main else soup.get_text()
        text = re.sub(r"\s+", " ", text).strip()
        return text[:settings.ARTICLE_MAX_CHARS] if text else "Could not extract content."
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
            try:
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
            except Exception:
                pass  # text index may not exist yet
            return results

        # Use a new event loop in this thread to avoid deadlock
        loop = asyncio.new_event_loop()
        try:
            results = loop.run_until_complete(_query())
        finally:
            loop.close()

        return ("Prior verdicts:\n" + "\n".join(results)) if results else "No prior verdicts found."
    except Exception as e:
        logger.warning(f"check_prior_verdicts error: {e}")
        return f"Could not query database: {e}"


@tool
def analyze_url_safety(url: str) -> str:
    """Analyze a URL for phishing, malware, or malicious indicators.
    Checks domain reputation, SSL certificate, URL structure anomalies,
    and WHOIS information. Use when a claim contains or references a URL.
    Input: full URL (http:// or https://).
    Returns: safety assessment with risk indicators."""
    try:
        import httpx
        from urllib.parse import urlparse

        parsed = urlparse(url)
        risk_factors = []
        safe_factors = []

        # Structural analysis
        domain = parsed.netloc.lower()
        path = parsed.path

        # Check for IP-based URLs (phishing indicator)
        import re as _re
        if _re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", domain):
            risk_factors.append("URL uses IP address instead of domain name (phishing indicator)")

        # Check for excessive subdomains
        subdomain_count = domain.count(".")
        if subdomain_count > 3:
            risk_factors.append(f"Excessive subdomains ({subdomain_count} dots) — possible domain spoofing")

        # Check for suspicious TLDs
        suspicious_tlds = [".xyz", ".tk", ".ml", ".ga", ".cf", ".gq", ".buzz", ".top", ".club"]
        if any(domain.endswith(tld) for tld in suspicious_tlds):
            risk_factors.append(f"Suspicious TLD detected in: {domain}")

        # Check for brand impersonation patterns
        brand_keywords = ["paypal", "amazon", "google", "microsoft", "apple", "netflix", "bank"]
        for brand in brand_keywords:
            if brand in domain and not domain.endswith(f"{brand}.com"):
                risk_factors.append(f"Possible brand impersonation: '{brand}' in non-official domain")

        # Check URL length (phishing URLs tend to be very long)
        if len(url) > 200:
            risk_factors.append(f"Unusually long URL ({len(url)} chars) — common phishing indicator")

        # Check for encoded characters in path
        if "%20" in path or "%00" in path or "../" in path:
            risk_factors.append("Suspicious encoding or path traversal patterns in URL")

        # SSL check
        try:
            with httpx.Client(timeout=settings.HTTP_TIMEOUT, follow_redirects=True) as client:
                resp = client.head(url)
                if parsed.scheme == "https":
                    safe_factors.append("Valid HTTPS/SSL connection")
                else:
                    risk_factors.append("No HTTPS — data transmitted insecurely")

                # Check for redirects to different domains
                if resp.url and urlparse(str(resp.url)).netloc != domain:
                    risk_factors.append(
                        f"Redirects to different domain: {urlparse(str(resp.url)).netloc}"
                    )
        except httpx.ConnectError:
            risk_factors.append("Domain unreachable — possibly expired or blocked")
        except Exception as e:
            risk_factors.append(f"Connection issue: {str(e)[:100]}")

        # WHOIS check for domain age
        try:
            import whois
            w = whois.whois(domain)
            if w.creation_date:
                from datetime import datetime, timezone
                created = w.creation_date if not isinstance(w.creation_date, list) else w.creation_date[0]
                age_days = (datetime.now(timezone.utc) - created.replace(tzinfo=timezone.utc)).days
                if age_days < 30:
                    risk_factors.append(f"Domain registered only {age_days} days ago (very new)")
                elif age_days < 180:
                    risk_factors.append(f"Domain is relatively new ({age_days} days old)")
                else:
                    safe_factors.append(f"Domain age: {age_days} days (established)")
        except Exception:
            pass  # WHOIS not available for all domains

        # Build assessment
        risk_score = len(risk_factors) / max(1, len(risk_factors) + len(safe_factors))
        if risk_score > 0.6:
            assessment = "HIGH RISK — likely phishing or malicious"
        elif risk_score > 0.3:
            assessment = "MODERATE RISK — exercise caution"
        else:
            assessment = "LOW RISK — appears legitimate"

        report = f"URL Safety Analysis for: {url}\nAssessment: {assessment}\n"
        if risk_factors:
            report += "\nRisk Indicators:\n" + "\n".join(f"  ⚠ {r}" for r in risk_factors)
        if safe_factors:
            report += "\nSafe Indicators:\n" + "\n".join(f"  ✓ {s}" for s in safe_factors)

        return report

    except Exception as e:
        logger.warning(f"analyze_url_safety error: {e}")
        return f"URL analysis failed: {e}"


@tool
def analyze_text_patterns(text: str) -> str:
    """Analyze text for linguistic patterns associated with misinformation.
    Examines emotional tone, certainty markers, clickbait indicators,
    readability, and psycholinguistic features that distinguish fake from real news.
    Input: text content (article, claim, or headline).
    Returns: linguistic analysis with misinformation risk indicators."""
    try:
        text_lower = text.lower()
        indicators = []
        reliable_markers = []

        # Emotional manipulation markers
        emotional_words = [
            "shocking", "unbelievable", "outrageous", "terrifying", "devastating",
            "incredible", "explosive", "bombshell", "horrifying", "disgusting",
            "miracle", "secret", "they don't want you to know", "wake up",
        ]
        emotional_hits = [w for w in emotional_words if w in text_lower]
        if len(emotional_hits) >= 2:
            indicators.append(
                f"High emotional manipulation: {len(emotional_hits)} emotional triggers "
                f"({', '.join(emotional_hits[:5])})"
            )
        elif emotional_hits:
            indicators.append(f"Mild emotional language: '{emotional_hits[0]}'")

        # Certainty/absolutism markers (fake news tends toward absolute claims)
        absolutist_words = [
            "always", "never", "completely", "totally", "100%", "proven",
            "absolutely", "definitely", "guaranteed", "without a doubt",
            "all scientists agree", "everyone knows",
        ]
        abs_hits = [w for w in absolutist_words if w in text_lower]
        if abs_hits:
            indicators.append(
                f"Absolutist language detected: {', '.join(abs_hits[:4])} "
                "(credible sources use hedging)"
            )

        # Clickbait patterns
        clickbait_patterns = [
            "you won't believe", "what happened next", "this one trick",
            "doctors hate", "exposed", "the truth about", "they lied",
            "big pharma", "mainstream media won't", "banned",
        ]
        cb_hits = [p for p in clickbait_patterns if p in text_lower]
        if cb_hits:
            indicators.append(f"Clickbait patterns: {', '.join(cb_hits[:3])}")

        # Source attribution check
        source_indicators = [
            "according to", "study published in", "researchers at",
            "official statement", "data from", "peer-reviewed",
        ]
        src_hits = [s for s in source_indicators if s in text_lower]
        if src_hits:
            reliable_markers.append(
                f"Source attribution present: {', '.join(src_hits[:3])}"
            )
        else:
            indicators.append("No source attribution found — claims lack verifiable references")

        # Urgency/pressure tactics
        urgency_words = [
            "share before deleted", "act now", "share immediately",
            "this is being censored", "before it's too late", "breaking",
        ]
        urgency_hits = [u for u in urgency_words if u in text_lower]
        if urgency_hits:
            indicators.append(f"Urgency/pressure tactics: {', '.join(urgency_hits[:3])}")

        # ALL CAPS ratio (excessive caps = sensationalism)
        words = text.split()
        caps_words = [w for w in words if w.isupper() and len(w) > 2]
        caps_ratio = len(caps_words) / max(1, len(words))
        if caps_ratio > 0.15:
            indicators.append(
                f"Excessive capitalization ({caps_ratio:.0%} of words) — sensationalism indicator"
            )

        # Sentence complexity (fake news tends to be simpler)
        sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
        if sentences:
            avg_words_per_sentence = len(words) / len(sentences)
            if avg_words_per_sentence < 10:
                indicators.append(
                    f"Very short sentences (avg {avg_words_per_sentence:.0f} words) — "
                    "typical of low-quality content"
                )
            elif avg_words_per_sentence > 20:
                reliable_markers.append("Complex sentence structure (typical of professional writing)")

        # Compute risk assessment
        risk_score = len(indicators) / max(1, len(indicators) + len(reliable_markers) + 2)
        if risk_score > 0.6:
            assessment = "HIGH misinformation risk based on linguistic patterns"
        elif risk_score > 0.3:
            assessment = "MODERATE misinformation risk — some concerning patterns"
        else:
            assessment = "LOW misinformation risk — text appears credible linguistically"

        report = f"Text Pattern Analysis:\nAssessment: {assessment}\n"
        if indicators:
            report += "\nMisinformation Indicators:\n" + "\n".join(f"  ⚠ {i}" for i in indicators)
        if reliable_markers:
            report += "\nCredibility Markers:\n" + "\n".join(f"  ✓ {r}" for r in reliable_markers)

        return report

    except Exception as e:
        logger.warning(f"analyze_text_patterns error: {e}")
        return f"Text analysis failed: {e}"


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
            "risk_level": data.get("risk_level", "suspicious"),
            "input_type": data.get("input_type", "text"),
            "model_used": settings.GROQ_MODEL,
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }
        return f"Verdict recorded: {label} (confidence={confidence:.2f})"

    except json.JSONDecodeError as e:
        return f"Invalid JSON: {e}. Fix and call produce_verdict again."
    except Exception as e:
        return f"Error recording verdict: {e}"


# ── Agent prompt ──────────────────────────────────────────────────────────────

AGENT_PROMPT = PromptTemplate.from_template("""You are the SeeThru Central Agent — an expert misinformation detection system.
You dynamically analyze content using the appropriate verification tools based on input type.

Available tools:
{tools}

DYNAMIC ANALYSIS PROCESS:
1. First, IDENTIFY the input type:
   - If the input contains a URL → use analyze_url_safety to check for phishing/malware
   - If the input is a text claim → use analyze_text_patterns for linguistic analysis
   - Always use check_prior_verdicts to check for duplicates
2. INVESTIGATE with evidence:
   - Use web_search for 2-3 targeted evidence queries
   - Use fetch_article to read source URLs in detail
3. SYNTHESIZE findings:
   - Cross-reference multiple verification signals
   - Aggregate confidence from all tools used
4. PRODUCE final verdict using produce_verdict (call ONCE)

RULES:
- Dynamically select tools based on input content (don't follow a fixed pipeline)
- For URLs: ALWAYS run analyze_url_safety before concluding
- For text claims: ALWAYS run analyze_text_patterns + web_search
- Cross-reference 2+ sources for high confidence (>0.8)
- Conflicting sources = lower confidence score
- Never fabricate quotes or sources
- produce_verdict must be called exactly once
- Include risk_level in verdict: "safe", "suspicious", "dangerous"

Input: {claim}
{context_block}

Format:
Thought: what should I do next and why
Action: tool name (one of [{tool_names}])
Action Input: input to the tool
Observation: result
... repeat as needed ...
Thought: I have sufficient evidence from multiple verification tools
Action: produce_verdict
Action Input: {{"label": "...", "confidence": 0.0, "explanation": "...", "reasoning_steps": [], "evidence": [], "key_entities": [], "suggested_sources": [], "risk_level": "safe|suspicious|dangerous", "input_type": "text|url|mixed"}}
Observation: Verdict recorded
Final Answer: Investigation complete.

{agent_scratchpad}""")


# ── Input type detection ──────────────────────────────────────────────────────

def _detect_input_type(text: str) -> str:
    """Dynamically detect input type: 'url', 'text', or 'mixed'."""
    import re as _re
    url_pattern = r'https?://[^\s<>\"\']+|www\.[^\s<>\"\']+\.[^\s<>\"\']+'
    urls = _re.findall(url_pattern, text)
    words = text.split()

    if urls and len(words) <= len(urls) * 3:
        return "url"
    elif urls:
        return "mixed"
    return "text"


# ── Main entry point ──────────────────────────────────────────────────────────

async def verify_claim(
    claim_text: str,
    context: Optional[str] = None,
    source_url: Optional[str] = None,
    language: str = "en",
    input_type: Optional[str] = None,
    retries: int = 1,
) -> dict:
    """Run the LangChain ReAct agent to dynamically fact-check content.
    The agent autonomously selects verification tools based on input type."""
    global _verdict_store

    if not settings.GROQ_API_KEY:
        return _stub_verdict(claim_text, "GROQ_API_KEY not configured")

    # Dynamic input type detection
    detected_type = input_type or _detect_input_type(claim_text)

    context_parts = []
    if context:
        context_parts.append(f"Context: {context}")
    if source_url:
        context_parts.append(f"Source URL: {source_url}")
    if language != "en":
        context_parts.append(
            f"Note: Claim is in '{language}'. Return JSON fields in English."
        )
    context_parts.append(f"Detected input type: {detected_type}")
    context_block = "\n".join(context_parts)

    # All 6 verification tools available — agent dynamically selects which to use
    tools = [
        web_search,
        fetch_article,
        check_prior_verdicts,
        analyze_url_safety,
        analyze_text_patterns,
        produce_verdict,
    ]

    # Try primary model, then fallbacks on rate limit
    fallback_models = _get_fallback_models()
    models_to_try = [settings.GROQ_MODEL] + [m for m in fallback_models if m != settings.GROQ_MODEL]

    for model_name in models_to_try:
        llm = ChatGroq(
            api_key=settings.GROQ_API_KEY,
            model=model_name,
            temperature=settings.GROQ_TEMPERATURE,
            max_tokens=settings.GROQ_MAX_TOKENS,
            timeout=settings.GROQ_REQUEST_TIMEOUT,
            max_retries=1,
        )
        agent = create_react_agent(llm=llm, tools=tools, prompt=AGENT_PROMPT)
        executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            max_iterations=settings.AGENT_MAX_ITERATIONS,
            handle_parsing_errors=True,
            early_stopping_method="generate",
        )

        _verdict_store.clear()
        try:
            loop = asyncio.get_event_loop()
            await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: executor.invoke({
                        "claim": claim_text,
                        "context_block": context_block,
                    })
                ),
                timeout=settings.AGENT_TIMEOUT,
            )

            verdict = _verdict_store.get("latest")
            if verdict:
                verdict["model_used"] = model_name
                logger.info(f"Agent verdict ({model_name}): {verdict['label']} (confidence={verdict['confidence']:.2f})")
                return verdict

            logger.warning(f"Agent did not call produce_verdict with model {model_name}")

        except asyncio.TimeoutError:
            logger.error(f"Agent timed out with model {model_name}")
            verdict = _verdict_store.get("latest")
            if verdict:
                verdict["model_used"] = model_name
                logger.info(f"Verdict recovered after timeout ({model_name}): {verdict['label']}")
                return verdict
        except Exception as e:
            error_str = str(e)
            logger.error(f"Agent error with model {model_name}: {error_str}")
            verdict = _verdict_store.get("latest")
            if verdict:
                verdict["model_used"] = model_name
                return verdict
            if "429" in error_str or "rate_limit" in error_str.lower():
                logger.info(f"Rate limited on {model_name}, trying next model...")
                await asyncio.sleep(2)
                continue
            break

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
        "risk_level": "suspicious",
        "input_type": _detect_input_type(claim_text),
        "model_used": "none",
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "requires_human_review": True,
    }