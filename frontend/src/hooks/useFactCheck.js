import { useState, useCallback } from "react";
import { useApp } from "../context/Appcontext.jsx";
import { analyzeAuto } from "../utils/api.js";

const AGENT_STAGES = [
  "🔍 Searching trusted news sources…",
  "📰 Extracting key claims from the article…",
  "⚖️ Cross-referencing with verified databases…",
  "📊 Calculating credibility score…",
  "📝 Compiling fact-check report…",
];

// Keep mock responses as fallback for demo purposes
const fc = (verdict, score, summary, claims, sources, assessment) =>
  `FACT_CHECK_START\n${JSON.stringify({ verdict, score, summary, claims, sources, assessment })}\nFACT_CHECK_END`;

const MOCK_RESPONSES = [
  fc(
    "MIXED", 48,
    "The article contains a mixture of verifiable facts and misleading framing. Some core claims are supported by evidence, but key context is omitted that significantly changes the interpretation.",
    [
      { text: "The headline statistic is technically accurate for the cited period", verdict: "TRUE" },
      { text: "The causal relationship implied by the headline is overstated", verdict: "MOSTLY_FALSE" },
      { text: "Key comparison data points are selectively omitted", verdict: "MOSTLY_TRUE" },
      { text: "The source cited is a peer-reviewed publication", verdict: "TRUE" },
    ],
    [
      "Reuters Fact Check — reuters.com/fact-check",
      "Associated Press Fact Check — apnews.com/hub/ap-fact-check",
      "Snopes — snopes.com",
      "PolitiFact — politifact.com",
    ],
    "While the raw statistic cited in the article appears in the referenced study, the article strips it of crucial context — namely, that the finding applied only to a specific subgroup under controlled conditions. When applied broadly as the headline suggests, the claim becomes misleading. This pattern of selective statistic use is common in sensationalist reporting. We recommend reading the primary source directly before sharing.",
  ),
  fc(
    "FALSE", 7,
    "This claim is demonstrably false. Multiple independent fact-checkers, government agencies, and peer-reviewed research have directly contradicted this narrative.",
    [
      { text: "The central claim contradicts established scientific consensus", verdict: "FALSE" },
      { text: "The cited 'study' is not peer-reviewed and comes from an advocacy group", verdict: "TRUE" },
      { text: "Similar claims have been debunked multiple times since 2020", verdict: "TRUE" },
      { text: "The story spread from a single anonymous social media post", verdict: "MOSTLY_TRUE" },
    ],
    [
      "WHO Fact-Check Network — who.int",
      "Full Fact — fullfact.org",
      "Lead Stories — leadstories.com",
      "Science Feedback — sciencefeedback.co",
    ],
    "This story appears to originate from a well-documented misinformation network that regularly packages debunked claims in new packaging. The core assertion has been addressed and refuted by multiple credible institutions. The 'source' cited is not a recognised scientific or journalistic organisation. We rate this claim as FALSE and advise caution before sharing.",
  ),
  fc(
    "MOSTLY_TRUE", 79,
    "The main claims in this report are broadly accurate and supported by official data, though some figures appear to be preliminary estimates subject to revision.",
    [
      { text: "The primary statistic comes from an official government data release", verdict: "TRUE" },
      { text: "The figures align with projections from independent analysts", verdict: "TRUE" },
      { text: "The report uses the most recent available data", verdict: "MOSTLY_TRUE" },
      { text: "The headline accurately reflects the body of the article", verdict: "MOSTLY_TRUE" },
    ],
    [
      "Official Government Statistical Release",
      "OECD Data — oecd.org/statistics",
      "Independent verification via World Bank",
      "Bloomberg — Economic Data Analysis",
    ],
    "This report is based on legitimate official data and is broadly accurate. Our main caution is that the underlying figures are preliminary estimates that may be revised in subsequent quarters — a nuance the article mentions only briefly. The analytical framing is fair and the conclusions are supported by the evidence presented. We rate this MOSTLY TRUE with a note to watch for any data revisions.",
  ),
  fc(
    "TRUE", 93,
    "This claim is accurate and well-supported by multiple independent lines of evidence from credible primary sources.",
    [
      { text: "The events described are confirmed by multiple independent news outlets", verdict: "TRUE" },
      { text: "Official records corroborate the key facts stated", verdict: "TRUE" },
      { text: "The timeline of events is accurately represented", verdict: "TRUE" },
      { text: "The figures cited match official published data", verdict: "TRUE" },
    ],
    [
      "Reuters — Independent Verification",
      "Associated Press — Primary Reporting",
      "BBC News — Corroborating Report",
      "Official Government Statement / Press Release",
    ],
    "After cross-referencing with multiple independent sources including official records, primary reporting from major news agencies, and corroborating coverage, we can confirm this claim is accurate. All material facts check out. The story represents responsible, evidence-based journalism. We rate this TRUE.",
  ),
  fc(
    "MOSTLY_FALSE", 18,
    "This claim is largely misleading. While a small kernel of truth exists, the overall framing is inaccurate and designed to create a false impression.",
    [
      { text: "A superficially similar event did occur, but under very different circumstances", verdict: "MIXED" },
      { text: "Key facts have been reversed or exaggerated", verdict: "MOSTLY_FALSE" },
      { text: "The claimed cause-and-effect relationship is not supported by evidence", verdict: "FALSE" },
      { text: "This claim appeared on known misinformation sites before mainstream coverage", verdict: "MOSTLY_TRUE" },
    ],
    [
      "PolitiFact — Independent Fact Check",
      "Washington Post Fact Checker",
      "The Guardian — Fact & Fiction Series",
      "Media Bias / Fact Check — mediabiasfactcheck.com",
    ],
    "This is an example of a 'misleading frame' — where a real event is described using selective, distorted, or reversed facts to lead the reader to a false conclusion. The underlying event is real, but the causal narrative, the figures cited, and the implied implications are largely fabricated or grossly exaggerated. This technique is particularly deceptive because it carries the plausibility of a real news hook. We rate this MOSTLY FALSE.",
  ),
];

export function useFactCheck(checkId) {
  const { addMessage, activeCheck } = useApp();
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [agentStage, setAgentStage] = useState("");

  const submitClaim = useCallback(
    async (content) => {
      if (!checkId || !content.trim()) return;

      // Add user claim message
      const userMsg = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      addMessage(checkId, userMsg);

      // Start agentic analysis
      setIsAnalysing(true);

      // Cycle through stages
      let stageIndex = 0;
      setAgentStage(AGENT_STAGES[0]);

      const stageInterval = setInterval(() => {
        stageIndex++;
        if (stageIndex < AGENT_STAGES.length) {
          setAgentStage(AGENT_STAGES[stageIndex]);
        } else {
          clearInterval(stageInterval);
        }
      }, 600);

      try {
        // Make API call to backend
        const response = await analyzeAuto(content.trim());
        
        // Format response into the expected message format
        const responseText = `FACT_CHECK_START\n${JSON.stringify({
          verdict: response.verdict || response.label,
          score: response.risk_score,
          summary: response.explanation,
          claims: response.evidence ? response.evidence.slice(0, 4) : [],
          sources: response.evidence ? response.evidence.map(e => e.source) : [],
          assessment: response.explanation,
        })}\nFACT_CHECK_END`;

        clearInterval(stageInterval);
        const assistantMsg = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: responseText,
          timestamp: new Date().toISOString(),
        };
        addMessage(checkId, assistantMsg);
      } catch (error) {
        console.error("Analysis failed:", error);
        clearInterval(stageInterval);
        
        // Show error message
        const errorMsg = {
          id: `msg-${Date.now()}-error`,
          role: "assistant",
          content: `❌ Analysis failed: ${error.message}. Please try again.`,
          timestamp: new Date().toISOString(),
        };
        addMessage(checkId, errorMsg);
      } finally {
        setIsAnalysing(false);
        setAgentStage("");
      }
    },
    [checkId, addMessage],
  );

  return {
    submitClaim,
    isAnalysing,
    agentStage,
    messages: activeCheck?.messages ?? [],
  };
}
