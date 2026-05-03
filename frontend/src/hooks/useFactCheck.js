import { useState, useCallback } from "react";
import { useApp } from "../context/Appcontext.jsx";
import { analyzeText, analyzeUrl, analyzeImage, normalizeAnalysis, formatAnalysisText } from "../utils/api";

// Dynamic input type detection — matches the backend's central agent logic
function detectInputType(content) {
  const urlPattern = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+\.[^\s<>"']+/g;
  const urls = content.match(urlPattern);
  const words = content.trim().split(/\s+/);

  if (urls && words.length <= urls.length * 3) return "url";
  if (urls) return "mixed";
  return "text";
}

export function useFactCheck(checkId) {
  const { addMessage, activeCheck } = useApp();
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [agentStage, setAgentStage] = useState("");

  const submitClaim = useCallback(
    async (content, { file } = {}) => {
      if (!checkId || (!content.trim() && !file)) return;

      // Add user claim message
      const userMsg = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: file ? `[Image: ${file.name}] ${content.trim()}` : content.trim(),
        timestamp: new Date().toISOString(),
      };
      addMessage(checkId, userMsg);

      setIsAnalysing(true);

      try {
        let response;

        if (file) {
          // Image analysis route
          setAgentStage("Analyzing image authenticity...");
          response = await analyzeImage(file, content.trim());
        } else {
          // Dynamic input type detection
          const inputType = detectInputType(content.trim());

          if (inputType === "url") {
            setAgentStage("Analyzing URL safety...");
            const urlMatch = content.match(/https?:\/\/[^\s<>"']+/);
            response = await analyzeUrl(urlMatch[0]);
          } else {
            setAgentStage("Agent investigating claim...");
            response = await analyzeText(content.trim());
          }
        }

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
