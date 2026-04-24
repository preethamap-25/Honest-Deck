import { useState, useCallback } from "react";
import { useApp } from "../context/Appcontext.jsx";

export function useChat(chatId) {
  const { addMessage, activeChat, setChecks } = useApp();
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(
    async (content) => {
      if (!chatId || !content.trim()) return;

      setIsTyping(true);

      try {
        // Send to backend
        const res = await fetch(`/api/checks/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (res.ok) {
          const data = await res.json();
          addMessage(chatId, data.message); // Add user message locally
        }

        // Poll for backend updates
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          const checkRes = await fetch("/api/checks");
          if (checkRes.ok) {
            const checksData = await checkRes.json();
            setChecks(checksData);
            
            const updatedCheck = checksData.find(c => c.id === chatId);
            const userMsgCount = updatedCheck?.messages.filter(m => m.role === "user").length || 0;
            const assistantMsgCount = updatedCheck?.messages.filter(m => m.role === "assistant").length || 0;
            
            if (assistantMsgCount >= userMsgCount || attempts > 15) {
              clearInterval(pollInterval);
              setIsTyping(false);
            }
          }
        }, 1000);

      } catch (error) {
        console.error("Failed to send message", error);
        setIsTyping(false);
      }
    },
    [chatId, addMessage, setChecks],
  );

  return { sendMessage, isTyping, messages: activeChat?.messages ?? [] };
}
