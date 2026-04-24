"""
CrewAI multi-agent crew for SEETHRU verification.
"""
from crewai import Agent, Task, Crew, Process
from crewai.tools import tool as crewai_tool

from tools.text_classifier import classify_text_sync
from tools.url_detector import detect_url_sync
from tools.image_detector import detect_image_sync
from tools.evidence_retrieval import retrieve_evidence_sync


# ── Wrapped tools ─────────────────────────────────────────────────────────────

@crewai_tool("text_classifier")
def text_classifier_tool(text: str) -> dict:
    """Classify text for misinformation using Gemini."""
    return classify_text_sync(text)


@crewai_tool("evidence_retrieval")
def evidence_tool(query: str) -> list:
    """Retrieve supporting or contradicting evidence from trusted sources."""
    return retrieve_evidence_sync(query)


@crewai_tool("url_detector")
def url_detector_tool(url: str) -> dict:
    """Detect if a URL is phishing, suspicious, or safe."""
    return detect_url_sync(url)


@crewai_tool("image_detector")
def image_detector_tool(image_b64: str) -> dict:
    """Detect if an image is AI-generated or manipulated."""
    return detect_image_sync(image_b64)


# ── Agents ─────────────────────────────────────────────────────────────────────

fact_checker = Agent(
    role="Fact Checker",
    goal="Detect misinformation and verify claims in text content",
    backstory=(
        "You are an expert journalist and fact-checker with a decade of experience "
        "identifying misinformation, propaganda, and misleading narratives."
    ),
    tools=[text_classifier_tool, evidence_tool],
    verbose=True,
)

url_analyst = Agent(
    role="URL Analyst",
    goal="Evaluate URLs for phishing, malware, and deceptive content",
    backstory=(
        "You are a cybersecurity specialist who has analyzed millions of URLs "
        "and can spot phishing patterns, suspicious domains, and redirect chains."
    ),
    tools=[url_detector_tool],
    verbose=True,
)

media_analyst = Agent(
    role="Media Analyst",
    goal="Verify image authenticity and detect AI-generated or manipulated media",
    backstory=(
        "You are a digital forensics expert specialising in detecting deepfakes, "
        "AI-generated imagery, and photo manipulation."
    ),
    tools=[image_detector_tool],
    verbose=True,
)


# ── Crew builder ───────────────────────────────────────────────────────────────

def build_crew(input_type: str, content: str) -> Crew:
    if input_type == "text":
        agents = [fact_checker]
        tasks = [
            Task(
                description=f"Analyze the following text for misinformation:\n\n{content}",
                agent=fact_checker,
                expected_output="A structured report with risk_score, label, and reasoning.",
            )
        ]
    elif input_type == "url":
        agents = [url_analyst]
        tasks = [
            Task(
                description=f"Evaluate the safety of this URL: {content}",
                agent=url_analyst,
                expected_output="A structured report with risk_score, label, and reasoning.",
            )
        ]
    elif input_type == "image":
        agents = [media_analyst]
        tasks = [
            Task(
                description="Analyze the provided base64-encoded image for authenticity.",
                agent=media_analyst,
                expected_output="A structured report with risk_score, label, and reasoning.",
            )
        ]
    else:
        agents = [fact_checker, url_analyst, media_analyst]
        tasks = [
            Task(
                description=f"Perform a comprehensive verification of: {content}",
                agent=fact_checker,
                expected_output="Comprehensive multi-modal verification report.",
            )
        ]

    return Crew(
        agents=agents,
        tasks=tasks,
        process=Process.sequential,
        verbose=True,
    )


def run_crew(input_type: str, content: str) -> str:
    crew = build_crew(input_type, content)
    result = crew.kickoff()
    return str(result)
