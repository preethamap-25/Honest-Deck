import { useState } from "react";
import { Copy, Check, Newspaper, Sparkles } from "lucide-react";
import { useToast } from "./ToastProvider";

function renderText(text) {
  return text.split("\n").map((line, index) => {
    if (!line.trim()) return <div key={index} className="h-3" />;
    if (/^\-\s+/.test(line)) {
      return (
        <div key={index} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
          <span>{line.replace(/^\-\s+/, "")}</span>
        </div>
      );
    }
    return (
      <p key={index} className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
        {line}
      </p>
    );
  });
}

function SourcesList({ sources }) {
  if (!sources?.length) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-700/70">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Sources
      </p>
      <ul className="space-y-1">
        {sources.map((source, index) => (
          <li key={`${source}-${index}`} className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {source}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();
  const analysis = message.analysis ?? null;

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    addToast("Copied to clipboard.", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`group flex gap-3 animate-message-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${isUser
          ? "bg-slate-700 text-white"
          : "bg-blue-600 text-white"
        }`}
      >
        {isUser ? <Newspaper size={14} /> : <Sparkles size={14} />}
      </div>

      <div className={`max-w-[82%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 border shadow-sm ${isUser
            ? "bg-slate-900 dark:bg-slate-800 border-slate-800 dark:border-slate-700 rounded-tr-md"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-tl-md"
          }`}
        >
          {isUser ? (
            <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-slate-800 dark:text-slate-100">
                {renderText(message.content)}
              </div>
              <SourcesList sources={analysis?.sources} />
            </div>
          )}
        </div>

        <div className={`flex items-center gap-2 px-1 ${isUser ? "flex-row-reverse" : ""}`}>
          <span className="text-[10px] text-slate-400">
            {new Date(message.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {!isUser && (
            <button
              onClick={copy}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors opacity-0 group-hover:opacity-100"
              title="Copy response"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
