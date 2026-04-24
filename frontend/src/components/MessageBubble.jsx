import { useState } from "react";
import { Copy, Check, Sparkles, Newspaper, ThumbsUp, ThumbsDown, ExternalLink, Shield } from "lucide-react";
import { useToast } from "./ToastProvider";
import { getVerdict } from "../data/verdictConfig";

/* ─── Fact-Check Result Parser ──────────────────────────────── */
function parseFactCheck(content) {
  try {
    const match = content.match(/FACT_CHECK_START\n([\s\S]*?)\nFACT_CHECK_END/);
    if (!match) return null;
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function getRemaining(content) {
  return content.replace(/FACT_CHECK_START[\s\S]*?FACT_CHECK_END\n?/, "").trim();
}

/* ─── Verdict Banner Component ──────────────────────────────── */
function VerdictBanner({ result }) {
  const vc = getVerdict(result.verdict);
  const [barVisible, setBarVisible] = useState(false);

  // Small trick: trigger the bar animation after mount
  setTimeout(() => setBarVisible(true), 100);

  const claimVerdictColor = {
    TRUE: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30",
    MOSTLY_TRUE: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30",
    MIXED: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30",
    MOSTLY_FALSE: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30",
    FALSE: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30",
  };

  const claimDot = {
    TRUE: "bg-emerald-500",
    MOSTLY_TRUE: "bg-green-500",
    MIXED: "bg-amber-500",
    MOSTLY_FALSE: "bg-orange-500",
    FALSE: "bg-red-500",
  };

  return (
    <div className={`rounded-2xl border ${vc.border} ${vc.bg} overflow-hidden`}>
      {/* Verdict Header */}
      <div className={`px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${vc.badge} flex items-center justify-center shadow-md`}>
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Honest Deck Verdict
            </p>
            <p className={`text-xl font-display font-bold ${vc.text}`}>{vc.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Credibility Score</p>
          <p className={`text-3xl font-bold ${vc.text}`}>{result.score}<span className="text-base font-normal text-slate-400">/100</span></p>
        </div>
      </div>

      {/* Score Bar */}
      <div className="px-5 pb-3">
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${vc.bar} rounded-full transition-all duration-1000 ease-out`}
            style={{ width: barVisible ? `${result.score}%` : "0%" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>Misinformation</span>
          <span>Verified Fact</span>
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 pb-4 border-t border-slate-200/60 dark:border-slate-700/60 pt-3">
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.summary}</p>
      </div>

      {/* Claims Checked */}
      {result.claims?.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Claims Analysed
          </p>
          <div className="space-y-2">
            {result.claims.map((claim, i) => {
              const cv = getVerdict(claim.verdict);
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${claimDot[claim.verdict] ?? "bg-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{claim.text}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${claimVerdictColor[claim.verdict] ?? ""}`}>
                    {cv.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sources */}
      {result.sources?.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Sources Cross-Referenced
          </p>
          <div className="space-y-1">
            {result.sources.map((src, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <ExternalLink size={11} className="text-blue-400 shrink-0" />
                <span>{src}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment */}
      {result.assessment && (
        <div className="px-5 pb-5 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Full Assessment
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{result.assessment}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Inline markdown renderer ──────────────────────────────── */
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-slate-800 dark:text-slate-100">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="bg-slate-100 dark:bg-slate-700 text-blue-700 dark:text-blue-300 font-mono text-xs px-1.5 py-0.5 rounded">{part.slice(1, -1)}</code>;
    return part;
  });
}

function parseMarkdown(text) {
  return text.split("\n").map((line, i) => {
    if (line === "") return <div key={i} className="h-1.5" />;
    if (/^#{1,3} /.test(line)) {
      const content = line.replace(/^#+\s/, "");
      return <p key={i} className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2">{content}</p>;
    }
    if (line.startsWith("- ") || line.startsWith("* "))
      return <li key={i} className="ml-4 text-sm text-slate-700 dark:text-slate-300 list-disc">{renderInline(line.slice(2))}</li>;
    return <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{renderInline(line)}</p>;
  });
}

/* ─── Main Export ───────────────────────────────────────────── */
export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const [liked, setLiked] = useState(null);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const factCheck = !isUser ? parseFactCheck(message.content) : null;
  const remaining = !isUser && factCheck ? getRemaining(message.content) : null;

  const copy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    addToast("Report copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`group flex gap-3 animate-message-in ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-0.5
        ${isUser
          ? "bg-gradient-to-br from-slate-500 to-slate-700 text-white"
          : "bg-gradient-to-br from-blue-600 to-indigo-700"
        }`}
      >
        {isUser
          ? <Newspaper size={14} className="text-white" />
          : <Sparkles size={14} className="text-white" />
        }
      </div>

      {/* Content */}
      <div className={`max-w-[82%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        {isUser ? (
          /* User: News Claim Card */
          <div className="bg-slate-800 dark:bg-slate-700 rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Claim Submitted</p>
            <p className="text-sm text-white leading-relaxed font-medium">{message.content}</p>
          </div>
        ) : factCheck ? (
          /* AI: Fact-Check Result Card */
          <div className="w-full max-w-2xl space-y-2">
            <VerdictBanner result={factCheck} />
            {remaining && (
              <div className="px-1">{parseMarkdown(remaining)}</div>
            )}
          </div>
        ) : (
          /* AI: Regular text response */
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
            {parseMarkdown(message.content)}
          </div>
        )}

        {/* Meta */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? "flex-row-reverse" : ""}`}>
          <span className="text-[10px] text-slate-400">
            {new Date(message.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {!isUser && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={copy} className="p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-500 transition-colors" title="Copy report">
                {copied ? <Check size={11} /> : <Copy size={11} />}
              </button>
              <button
                onClick={() => { setLiked(true); addToast("Thanks for the feedback!", "success"); }}
                className={`p-1 rounded-lg transition-colors ${liked === true ? "text-blue-500" : "text-slate-400 hover:text-blue-500"}`}
              >
                <ThumbsUp size={11} />
              </button>
              <button
                onClick={() => { setLiked(false); addToast("We'll improve our analysis.", "info"); }}
                className={`p-1 rounded-lg transition-colors ${liked === false ? "text-red-400" : "text-slate-400 hover:text-red-400"}`}
              >
                <ThumbsDown size={11} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
