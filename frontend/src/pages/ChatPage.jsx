import { useEffect, useRef, useState } from "react";
import { Shield, ArrowDown, Newspaper, AlertCircle } from "lucide-react";
import { useApp } from "../context/Appcontext";
import { useFactCheck } from "../hooks/useFactCheck";
import MessageBubble from "../components/MessageBubble";
import TypingIndicator from "../components/TypingIndicator";
import NewsInput from "../components/ChatInput";
import Topbar from "../components/Topbar";

const EXAMPLE_CLAIMS = [
  "Drinking bleach kills COVID-19",
  "Eating chocolate improves memory and focus",
  "India will be the world's largest economy by 2050",
  "The Great Wall of China is visible from space",
  "We only use 10% of our brain's capacity",
];

export default function ChatPage() {
  const { activeCheckId, activeCheck, createCheck, setActiveCheckId } = useApp();
  const { submitClaim, isAnalysing, agentStage, messages } = useFactCheck(activeCheckId);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [agentMode, setAgentMode] = useState("balanced");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAnalysing]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  const handleSubmit = async (text) => {
    let checkId = activeCheckId;
    if (!checkId) {
      checkId = createCheck();
      setActiveCheckId(checkId);
      await new Promise((r) => setTimeout(r, 50));
    }
    submitClaim(text);
  };

  const isEmpty = !messages || messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <Topbar title={activeCheck?.title ?? "Fact Check"} />

      <div ref={containerRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <EmptyState onSuggest={handleSubmit} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
            {isAnalysing && <TypingIndicator agentStage={agentStage} />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Scroll-to-bottom */}
      {showScrollBtn && (
        <button
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-32 right-8 w-9 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-all z-10"
        >
          <ArrowDown size={16} />
        </button>
      )}

      {/* News Input */}
      <div className="shrink-0 px-4 pb-5 pt-3 bg-gradient-to-t from-slate-50/90 dark:from-slate-950/90 to-transparent">
        <div className="max-w-3xl mx-auto">
          <NewsInput
            onSubmit={handleSubmit}
            disabled={isAnalysing}
            mode={agentMode}
            onModeChange={setAgentMode}
          />
          <p className="text-center text-[11px] text-slate-400 mt-2">
            Honest Deck analyses claims using AI and cross-references trusted sources.{" "}
            <span className="text-blue-500">Not a substitute for professional journalism.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSuggest }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mb-5 shadow-xl">
        <Shield size={28} className="text-white" />
      </div>
      <h2 className="font-display font-bold text-2xl text-slate-800 dark:text-white mb-2">
        Is it true?
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-8 leading-relaxed">
        Paste any news headline, article excerpt, or URL and Honest Deck&apos;s AI agent will fact-check it against verified sources and return a credibility verdict.
      </p>

      {/* Example claims */}
      <div className="w-full max-w-lg space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Newspaper size={14} className="text-blue-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Try one of these common claims
          </p>
        </div>
        {EXAMPLE_CLAIMS.map((claim) => (
          <button
            key={claim}
            onClick={() => onSuggest(claim)}
            className="w-full text-left px-4 py-3 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 transition-all font-medium leading-snug shadow-sm group"
          >
            <span className="flex items-center gap-2">
              <AlertCircle size={13} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors shrink-0" />
              {claim}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
