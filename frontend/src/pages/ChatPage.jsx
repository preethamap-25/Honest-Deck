import { useEffect, useRef, useState } from "react";
import { Sparkles, Plus, ArrowDown } from "lucide-react";
import { useApp } from "../context/Appcontext";
import { useChat } from "../hooks/useChat";
import MessageBubble from "../components/MessageBubble";
import TypingIndicator from "../components/TypingIndicator";
import ChatInput from "../components/ChatInput";
import Topbar from "../components/Topbar";

const SUGGESTIONS = [
  "Explain a complex topic simply",
  "Write code for a new feature",
  "Help me brainstorm ideas",
  "Review and improve my writing",
];

export default function ChatPage() {
  const { activeChatId, activeChat, createChat, setActiveChatId } = useApp();
  const { sendMessage, isTyping, messages } = useChat(activeChatId);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [model, setModel] = useState(activeChat?.model ?? "Seethru Pro");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  const handleSend = async (text) => {
    let chatId = activeChatId;
    if (!chatId) {
      chatId = createChat();
      setActiveChatId(chatId);
      await new Promise((r) => setTimeout(r, 50));
    }
    sendMessage(text);
  };

  const isEmpty = !messages || messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <Topbar title={activeChat?.title ?? "Seethru"} />

      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto"
      >
        {isEmpty ? (
          <EmptyState onSuggest={handleSend} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 group">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Scroll to bottom */}
      {showScrollBtn && (
        <button
          onClick={() =>
            bottomRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          className="absolute bottom-24 right-8 w-9 h-9 bg-white border border-blue-200 rounded-full shadow-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-all z-10"
        >
          <ArrowDown size={16} />
        </button>
      )}

      {/* Input */}
      <div className="shrink-0 px-4 pb-5 pt-3 bg-gradient-to-t from-blue-50/80 to-transparent">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={handleSend}
            disabled={isTyping}
            model={model}
            onModelChange={setModel}
          />
          <p className="text-center text-[11px] text-slate-400 mt-2">
            Seethru may make mistakes. Consider verifying important info.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSuggest }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-200 flex items-center justify-center mb-5 shadow-md">
        <Sparkles size={28} className="text-blue-600" />
      </div>
      <h2 className="font-display font-bold text-2xl text-slate-800 mb-2">
        Hi, I'm Seethru
      </h2>
      <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">
        Your intelligent AI assistant. Ask me anything — I'm here to help you
        think, create, and build.
      </p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-md">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            className="text-left p-3.5 bg-white hover:bg-blue-50 border border-blue-100 hover:border-blue-300 rounded-xl text-sm text-slate-600 hover:text-blue-700 transition-all font-medium leading-snug shadow-sm"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
