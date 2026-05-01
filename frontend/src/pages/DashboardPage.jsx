import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Radio, RefreshCw, ExternalLink, Clock, ChevronRight, Shield,
  TrendingUp, AlertTriangle, Wifi, Filter,
} from "lucide-react";
import Topbar from "../components/Topbar";
import { useApp } from "../context/Appcontext";
import { getVerdict, TAG_COLORS } from "../data/verdictConfig";
import { getNews, getAlerts } from "../utils/api";

// Categories based on what backend might return
const CATEGORIES = ["All", "Health", "Politics", "Science", "Technology", "Climate", "Economy"];

const SOURCE_BADGE = {
  trusted:    { label: "Trusted Source", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30" },
  unverified: { label: "Unverified Source", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30" },
  unreliable: { label: "Known Unreliable", color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30" },
};

/* ─── Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const { setActiveCheckId, createCheck } = useApp();
  const navigate = useNavigate();
  const [category, setCategory] = useState("All");
  const [newsItems, setNewsItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [ticker, setTicker] = useState(0);

  // Fetch news from backend
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getNews("latest news", 20);
        
        // Transform backend data to match frontend format
        const transformed = (data.articles || []).map((article, index) => ({
          id: `news-${index}`,
          headline: article.headline || article.title || "Unknown headline",
          source: article.source || "Unknown Source",
          sourceType: article.source_credibility || "unverified",
          category: article.category || "General",
          time: article.published_at ? new Date(article.published_at).toLocaleString() : "Unknown",
          excerpt: article.excerpt || article.description || "",
          verdict: article.verdict || "MIXED",
          score: article.credibility_score ?? 50,
          checking: false,
          breaking: article.is_breaking || false,
        }));
        
        setNewsItems(transformed);
      } catch (err) {
        console.error("Failed to fetch news:", err);
        setError(err.message);
        // Keep showing something even if API fails - this helps debugging
        setNewsItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Pulse ticker for live dot
  useEffect(() => {
    const id = setInterval(() => setTicker((p) => p + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { 
      setRefreshing(false); 
      setLastRefresh(new Date());
      // Optionally refetch news here
    }, 1400);
  };

  const factCheckThis = (item) => {
    const id = createCheck(item.headline);
    setActiveCheckId(id);
    navigate("/");
  };

  const displayed = newsItems.filter(
    (n) => category === "All" || n.category === category,
  );

  const falseCount = newsItems.filter((n) => n.verdict === "FALSE" || n.verdict === "MOSTLY_FALSE").length;
  const trueCount  = newsItems.filter((n) => n.verdict === "TRUE"  || n.verdict === "MOSTLY_TRUE").length;
  const checkingCount = 0; // For real API, we'd need status polling

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
              Verifying trending news from {newsItems.length} sources
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
              Updated {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
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
            { label: "Trending Stories", value: newsItems.length, color: "text-slate-700 dark:text-slate-200" },
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
          {/* Error state */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
              ⚠️ Failed to load news: {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Loading news from backend...</p>
              </div>
            </div>
          )}

          {/* Category Tabs */}
          {!isLoading && (
            <>
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

              {/* Breaking News Banner */}
              {displayed.filter((n) => n.breaking).length > 0 && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">⚡ Breaking</span>
                    <div className="flex gap-4 mt-1 overflow-x-auto">
                      {displayed
                        .filter((n) => n.breaking)
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

              {/* News Grid */}
              {displayed.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No news found in this category</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {displayed.map((item) => {
                    const vc = getVerdict(item.verdict);
                    const sb = SOURCE_BADGE[item.sourceType];

                    return (
                      <NewsCard
                        key={item.id}
                        item={item}
                        vc={vc}
                        sb={sb}
                        onFactCheck={() => factCheckThis(item)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Footer */}
              <div className="text-center py-4 space-y-1">
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <Radio size={12} />
                  <p className="text-xs">SeeThru monitors 200+ news sources and social media in real time</p>
                </div>
                <p className="text-[11px] text-slate-300 dark:text-slate-600">
                  AI verdicts are for informational purposes only. Always verify with primary sources.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── News Card ────────────────────────────────────────────── */
function NewsCard({ item, vc, sb, onFactCheck }) {
  return (
    <div className={`bg-white dark:bg-slate-800/60 border rounded-2xl p-4 transition-all hover:shadow-md group
      ${vc ? `${vc.border}` : "border-slate-200 dark:border-slate-700"}`}
    >
      <div className="flex items-start gap-3">
        {/* Verdict indicator */}
        <div className={`shrink-0 w-14 rounded-xl flex flex-col items-center justify-center py-2 gap-0.5 border
          ${vc ? `${vc.bg} ${vc.border}` : ""}`}
        >
          <>
            <p className={`text-[9px] font-bold uppercase tracking-wide text-center leading-tight ${vc?.text}`}>
              {vc?.label.split(" ").map((w, i) => <span key={i} className="block">{w}</span>)}
            </p>
            <p className={`text-base font-bold mt-0.5 ${vc?.text}`}>{item.score}</p>
          </>
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

      {/* Score bar */}
      {vc && (
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
