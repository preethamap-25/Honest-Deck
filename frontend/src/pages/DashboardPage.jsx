import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Radio, RefreshCw, ExternalLink, Clock, ChevronRight, Shield,
  TrendingUp, AlertTriangle, Wifi, Filter,
} from "lucide-react";
import Topbar from "../components/Topbar";
import { useApp } from "../context/Appcontext";
import { useDashboard } from "../hooks/useDashboard";
import { getVerdict, TAG_COLORS } from "../data/verdictConfig";

/* ─── Source badge config ─────────────────────────────────── */
const SOURCE_BADGE = {
  trusted:    { label: "Trusted Source", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30" },
  unverified: { label: "Unverified Source", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30" },
  unreliable: { label: "Known Unreliable", color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30" },
  api:        { label: "API Submission", color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" },
  extension:  { label: "Browser Extension", color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30" },
  manual:     { label: "Manual Check", color: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30" },
};

const CATEGORIES = ["All", "High Risk", "Checking", "Verified", "False"];

/* ─── Helper: map backend feed items to display format ───── */
function mapFeedItem(item) {
  const verdictMap = {
    true: "TRUE",
    false: "FALSE",
    misleading: "MOSTLY_FALSE",
    partially_true: "MIXED",
    unverifiable: "UNVERIFIABLE",
  };

  return {
    id: item.id,
    headline: item.text?.slice(0, 120) || "Untitled claim",
    source: item.source || "api",
    sourceType: item.source || "api",
    category: item.risk_level === "dangerous" ? "High Risk" :
              item.checking ? "Checking" :
              item.verdict === "false" || item.verdict === "misleading" ? "False" : "Verified",
    time: item.created_at ? _timeAgo(item.created_at) : "Just now",
    excerpt: item.explanation || item.text?.slice(0, 200) || "",
    verdict: verdictMap[item.verdict] || (item.checking ? null : "UNVERIFIABLE"),
    score: item.confidence != null ? Math.round(item.confidence * 100) : null,
    checking: item.checking,
    breaking: item.risk_level === "dangerous" || item.priority >= 7,
  };
}

function _timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─── Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const { setActiveCheckId, createCheck } = useApp();
  const navigate = useNavigate();
  const { liveFeed, alerts, stats, isLoading, loadAll, loadLiveFeed, startPolling, stopPolling } = useDashboard();
  const [category, setCategory] = useState("All");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [ticker, setTicker] = useState(0);

  // Load data on mount and start dynamic polling
  useEffect(() => {
    loadAll();
    const pollInterval = parseInt(import.meta.env.VITE_POLL_INTERVAL_MS || "30000", 10);
    startPolling(pollInterval); // refresh for real-time updates
    return () => stopPolling();
  }, [loadAll, startPolling, stopPolling]);

  // Pulse ticker for live dot
  useEffect(() => {
    const id = setInterval(() => setTicker((p) => p + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLiveFeed();
    setRefreshing(false);
    setLastRefresh(new Date());
  };

  const factCheckThis = (item) => {
    const id = createCheck(item.headline);
    setActiveCheckId(id);
    navigate("/");
  };

  // Map backend data to display items dynamically
  const displayItems = liveFeed.map(mapFeedItem);
  const filtered = displayItems.filter(
    (n) => category === "All" || n.category === category,
  );

  const falseCount = displayItems.filter((n) => n.verdict === "FALSE" || n.verdict === "MOSTLY_FALSE").length;
  const trueCount  = displayItems.filter((n) => n.verdict === "TRUE" || n.verdict === "MOSTLY_TRUE").length;
  const checkingCount = displayItems.filter((n) => n.checking).length;

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Live News" />

      <div className="flex-1 overflow-y-auto">
        {/* Live Header Strip */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full bg-red-400 ${ticker % 2 === 0 ? "opacity-100" : "opacity-40"} transition-opacity duration-700`} />
              <span className="text-white text-xs font-bold uppercase tracking-widest">Live</span>
            </div>
            <span className="text-blue-200 text-xs">
              Verifying claims from {displayItems.length} submissions
            </span>
            {checkingCount > 0 && (
              <span className="flex items-center gap-1.5 bg-white/10 text-blue-100 text-xs px-2.5 py-0.5 rounded-full">
                <Wifi size={10} className="animate-pulse" />
                {checkingCount} checking now…
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-300 text-xs">
              Updated {lastRefresh.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </span>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs px-2.5 py-1.5 rounded-lg transition-all"
            >
              <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center gap-6 overflow-x-auto">
          {[
            { label: "Total Claims", value: displayItems.length, color: "text-slate-700 dark:text-slate-200" },
            { label: "Verified True", value: trueCount, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Misinformation", value: falseCount, color: "text-red-600 dark:text-red-400" },
            { label: "Being Checked", value: checkingCount, color: "text-blue-600 dark:text-blue-400" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2 shrink-0">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{s.label}</p>
              <span className="text-slate-200 dark:text-slate-700">|</span>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Filter size={14} className="text-slate-400 shrink-0" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                  ${category === cat
                    ? "bg-blue-600 text-white shadow"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Breaking / High Risk Alerts */}
          {filtered.filter((n) => n.breaking && !n.checking).length > 0 && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">⚡ High Risk</span>
                <div className="flex gap-4 mt-1 overflow-x-auto">
                  {filtered
                    .filter((n) => n.breaking && !n.checking)
                    .map((n) => {
                      const vc = getVerdict(n.verdict);
                      return (
                        <button
                          key={n.id}
                          onClick={() => factCheckThis(n)}
                          className="shrink-0 flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                        >
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${vc.badge} text-white`}>{vc.label}</span>
                          <span className="text-xs text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{n.headline}</span>
                          <ChevronRight size={11} className="text-slate-400 shrink-0" />
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Claims Grid — dynamically populated from backend */}
          <div className="grid grid-cols-1 gap-3">
            {isLoading && filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <RefreshCw size={20} className="animate-spin mx-auto mb-3" />
                <p className="text-sm">Loading live data from SeeThru backend...</p>
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Shield size={24} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No claims to display</p>
                <p className="text-xs mt-1">Submit a claim for fact-checking to see it appear here dynamically.</p>
              </div>
            )}
            {filtered.map((item) => {
              const isChecking = item.checking;
              const vc = !isChecking ? getVerdict(item.verdict) : null;
              const sb = SOURCE_BADGE[item.sourceType];

              return (
                <NewsCard
                  key={item.id}
                  item={item}
                  isChecking={isChecking}
                  vc={vc}
                  sb={sb}
                  onFactCheck={() => factCheckThis(item)}
                />
              );
            })}
          </div>

          {/* Footer */}
          <div className="text-center py-4 space-y-1">
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <Radio size={12} />
              <p className="text-xs">SeeThru dynamically verifies content using AI agents in real time</p>
            </div>
            <p className="text-[11px] text-slate-300 dark:text-slate-600">
              Data refreshes automatically every 30s. AI verdicts are for informational purposes only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── News Card ────────────────────────────────────────────── */
function NewsCard({ item, isChecking, vc, sb, onFactCheck }) {
  return (
    <div className={`bg-white dark:bg-slate-800/60 border rounded-2xl p-4 transition-all hover:shadow-md group
      ${vc ? `${vc.border}` : "border-slate-200 dark:border-slate-700"}`}
    >
      <div className="flex items-start gap-3">
        {/* Verdict indicator */}
        <div className={`shrink-0 w-14 rounded-xl flex flex-col items-center justify-center py-2 gap-0.5 border
          ${isChecking ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" : vc ? `${vc.bg} ${vc.border}` : ""}`}
        >
          {isChecking ? (
            <>
              <div className="flex gap-0.5 mb-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1 h-1 rounded-full bg-blue-400 animate-pulse-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide text-center leading-tight">Checking…</p>
            </>
          ) : (
            <>
              <p className={`text-[9px] font-bold uppercase tracking-wide text-center leading-tight ${vc?.text}`}>
                {vc?.label.split(" ").map((w, i) => <span key={i} className="block">{w}</span>)}
              </p>
              <p className={`text-base font-bold mt-0.5 ${vc?.text}`}>{item.score}</p>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {/* Category */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TAG_COLORS[item.category] ?? "bg-slate-100 text-slate-600"}`}>
              {item.category}
            </span>
            {/* Source credibility */}
            {sb && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sb.color}`}>
                {sb.label}
              </span>
            )}
            {/* Breaking */}
            {item.breaking && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500 text-white animate-pulse">
                ⚡ Breaking
              </span>
            )}
          </div>

          {/* Headline */}
          <p className="text-sm font-bold text-slate-800 dark:text-white leading-snug mb-1.5 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
            {item.headline}
          </p>

          {/* Excerpt */}
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-2">
            {item.excerpt}
          </p>

          {/* Footer Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {item.source}
              </span>
              <span className="text-slate-200 dark:text-slate-700">·</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock size={10} /> {item.time}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onFactCheck}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <Shield size={11} /> Deep-check
              </button>
              <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors">
                <ExternalLink size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Score bar (only when verdict is known) */}
      {!isChecking && vc && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 shrink-0">Credibility</span>
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full ${vc.bar} rounded-full`} style={{ width: `${item.score}%` }} />
            </div>
            <span className={`text-[11px] font-bold ${vc.text} shrink-0`}>{item.score}/100</span>
          </div>
        </div>
      )}
    </div>
  );
}
