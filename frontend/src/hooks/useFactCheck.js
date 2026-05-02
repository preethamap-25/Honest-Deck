import { useState, useCallback } from "react";
import { useApp } from "../context/Appcontext.jsx";
import { analyzeText, normalizeAnalysis, formatAnalysisText } from "../utils/api";

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

      setIsAnalysing(true);
      setAgentStage("Checking backend response...");

      try {
        const response = await analyzeText(content.trim());
        const analysis = normalizeAnalysis(response);
        const assistantMsg = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: formatAnalysisText(analysis),
          analysis,
          timestamp: new Date().toISOString(),
        };
        addMessage(checkId, assistantMsg);
      } catch (error) {
        const assistantMsg = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: `Verdict: ERROR\n\nUnable to reach the backend. ${error.message}`,
          analysis: {
            verdict: "ERROR",
            confidence: null,
            summary: error.message,
            assessment: error.message,
            sources: [],
          },
          timestamp: new Date().toISOString(),
        };
        addMessage(checkId, assistantMsg);
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
