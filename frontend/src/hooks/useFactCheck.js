import { useState, useCallback, useEffect } from "react";
import { useApp } from "../context/Appcontext.jsx";

const AGENT_STAGES = [
  "🔍 Searching trusted news sources…",
  "📰 Extracting key claims from the article…",
  "⚖️ Cross-referencing with verified databases…",
  "📊 Calculating credibility score…",
  "📝 Compiling fact-check report…",
];

export function useFactCheck(checkId) {
  const { addMessage, activeCheck, setChecks } = useApp();
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [agentStage, setAgentStage] = useState("");

  const submitClaim = useCallback(
    async (content) => {
      if (!checkId || !content.trim()) return;

      setIsAnalysing(true);

      // Cycle through stages
      let stageIndex = 0;
      setAgentStage(AGENT_STAGES[0]);

      const stageInterval = setInterval(() => {
        stageIndex = (stageIndex + 1) % AGENT_STAGES.length;
        setAgentStage(AGENT_STAGES[stageIndex]);
      }, 800);

      try {
        // Send to backend
        const res = await fetch(`/api/checks/${checkId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (res.ok) {
          const data = await res.json();
          addMessage(checkId, data.message); // Add user message locally
        }

        // Poll for backend updates (simulate waiting for background agent task)
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          const checkRes = await fetch("/api/checks");
          if (checkRes.ok) {
            const checksData = await checkRes.json();
            setChecks(checksData);
            
            const updatedCheck = checksData.find(c => c.id === checkId);
            const userMsgCount = updatedCheck?.messages.filter(m => m.role === "user").length || 0;
            const assistantMsgCount = updatedCheck?.messages.filter(m => m.role === "assistant").length || 0;
            
            // Assuming 1 assistant message per user message. If equal, it's done.
            if (assistantMsgCount >= userMsgCount || attempts > 15) {
              clearInterval(pollInterval);
              clearInterval(stageInterval);
              setIsAnalysing(false);
              setAgentStage("");
            }
          }
        }, 1000);

      } catch (error) {
        console.error("Failed to submit claim", error);
        clearInterval(stageInterval);
        setIsAnalysing(false);
        setAgentStage("");
      }
    },
    [checkId, addMessage, setChecks],
  );

  return {
    submitClaim,
    isAnalysing,
    agentStage,
    messages: activeCheck?.messages ?? [],
  };
}
