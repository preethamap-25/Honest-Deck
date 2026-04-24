import { useState, useCallback } from "react";
import { useApp } from "../context/Appcontext.jsx";

const MOCK_RESPONSES = [
  "That's a great question! Let me think through this carefully.\n\nBased on what you've shared, I'd say the key insight here is that **complexity often hides in plain sight**. Breaking it down into smaller pieces usually reveals a clear path forward.\n\nWould you like me to elaborate on any specific aspect?",
  "Absolutely! Here's my take:\n\n1. **First**, consider the core problem you're solving\n2. **Then**, identify the constraints and requirements\n3. **Finally**, work backwards from the ideal outcome\n\nThis approach tends to surface the best solutions efficiently.",
  "Great point! I've analyzed this from multiple angles and here's what stands out:\n\nThe most effective approach combines **systematic thinking** with **creative flexibility**. Neither alone is sufficient — you need both working in tandem.\n\nLet me know if you'd like a deeper dive into any of these concepts!",
  "Interesting! Let me share a few perspectives on this:\n\n```\nKey considerations:\n- Context matters enormously\n- Edge cases are often where the real complexity lives\n- Iteration beats perfection every time\n```\n\nDoes this align with what you were thinking?",
  "I love this kind of question! The answer is nuanced but here's the crux:\n\n> The simplest explanation that fits all the facts is usually correct.\n\nApplied here, that means looking for the **minimum viable insight** — the one idea that makes everything else click into place.",
];

export function useChat(chatId) {
  const { addMessage, activeChat } = useApp();
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(
    async (content) => {
      if (!chatId || !content.trim()) return;

      // Add user message
      const userMsg = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      addMessage(chatId, userMsg);

      // Simulate AI response
      setIsTyping(true);
      const delay = 800 + Math.random() * 1200;

      setTimeout(() => {
        const responseText =
          MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
        const assistantMsg = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: responseText,
          timestamp: new Date().toISOString(),
        };
        addMessage(chatId, assistantMsg);
        setIsTyping(false);
      }, delay);
    },
    [chatId, addMessage],
  );

  return { sendMessage, isTyping, messages: activeChat?.messages ?? [] };
}
