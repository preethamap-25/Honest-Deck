import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Radio, RefreshCw, ExternalLink, Clock, ChevronRight, Shield,
  TrendingUp, AlertTriangle, Wifi, Filter,
} from "lucide-react";
import Topbar from "../components/Topbar";
import { useApp } from "../context/Appcontext";
import { getVerdict, TAG_COLORS } from "../data/verdictConfig";

/* ─── Mock live news data ─────────────────────────────────── */
const LIVE_NEWS = [
  {
    id: "ln-1",
    headline: "Scientists discover single-dose drug that 'cures all cancers', trial results leaked",
    source: "ViralHealth.net",
    sourceType: "unverified",
    category: "Health",
    time: "2 min ago",
    excerpt: "A widely shared social media post claims a new pharmaceutical compound has shown 99% efficacy against all forms of cancer in a leaked Phase 1 trial.",
    verdict: "FALSE",
    score: 4,
    checking: false,
    breaking: true,
  },
  {
    id: "ln-2",
    headline: "Global average temperature breaks record for third consecutive month, NOAA confirms",
    source: "Reuters",
    sourceType: "trusted",
    category: "Climate",
    time: "8 min ago",
    excerpt: "Data released by the National Oceanic and Atmospheric Administration shows June 2025 was the hottest June on record, continuing a trend that began in April.",
    verdict: "TRUE",
    score: 96,
    checking: false,
    breaking: false,
  },
  {
    id: "ln-3",
    headline: "New government policy will freeze all private bank accounts starting July 1",
    source: "FreeTruthNews.io",
    sourceType: "unreliable",
    category: "Economy",
    time: "11 min ago",
    excerpt: "Posts circulating on Telegram and WhatsApp claim the Reserve Bank of India will enforce a mandatory freeze on all private bank accounts under a new emergency economic policy.",
    verdict: "FALSE",
    score: 2,
    checking: false,
    breaking: true,
  },
  {
    id: "ln-4",
    headline: "India's space agency ISRO successfully tests reusable rocket engine for lunar mission",
    source: "The Hindu",
    sourceType: "trusted",
    category: "Science",
    time: "19 min ago",
    excerpt: "ISRO confirmed a successful hot-fire test of its CE-20 cryogenic engine variant intended for the upcoming Chandrayaan-4 mission.",
    verdict: "TRUE",
    score: 92,
    checking: false,
    breaking: false,
  },
  {
    id: "ln-5",
    headline: "Study claims smartphones cause brain tumours after 10 years of use",
    source: "NaturalNewsTruth.com",
    sourceType: "unreliable",
    category: "Health",
    time: "25 min ago",
    excerpt: "An article citing an unnamed university study claims that daily smartphone use for a decade significantly increases the risk of glioblastoma.",
    verdict: "MOSTLY_FALSE",
    score: 17,
    checking: false,
    breaking: false,
  },
  {
    id: "ln-6",
    headline: "Elon Musk announces X will become a fully regulated financial services platform by end of 2025",
    source: "Financial Times",
    sourceType: "trusted",
    category: "Technology",
    time: "34 min ago",
    excerpt: "X Corp has applied for financial services licences in multiple countries, though the 'end of 2025' timeline has not been confirmed by regulatory bodies.",
    verdict: "MIXED",
    score: 54,
    checking: false,
    breaking: false,
  },
  {
    id: "ln-7",
    headline: "WHO declares new 'Disease X' outbreak in Central Africa — thousands feared dead",
    source: "PanicNews24.com",
    sourceType: "unreliable",
    category: "Health",
    time: "38 min ago",
    excerpt: "Viral posts claim the WHO has declared an emergency outbreak of Disease X with unconfirmed death tolls circulating on social media.",
    verdict: "MOSTLY_FALSE",
    score: 11,
    checking: false,
    breaking: true,
  },
  {
    id: "ln-8",
    headline: "India passes 100GW solar capacity milestone, becomes third globally",
    source: "BBC News",
    sourceType: "trusted",
    category: "Climate",
    time: "47 min ago",
    excerpt: "India's Ministry of New and Renewable Energy confirmed the milestone, placing the country third after China and the United States in installed solar capacity.",
    verdict: "TRUE",
    score: 94,
    checking: false,
    breaking: false,
  },
  {
    id: "ln-9",
    headline: "Eating turmeric every morning cures diabetes in 3 weeks, doctors confirm",
    source: "AyurvedaToday.in",
    sourceType: "unverified",
    category: "Health",
    time: "52 min ago",
    excerpt: "A viral article claims Indian medical doctors have 'confirmed' that consuming raw turmeric paste each morning eliminates Type 2 diabetes within 21 days.",
    verdict: "FALSE",
    score: 6,
    checking: false,
    breaking: false,
  },
  {
    id: "ln-10",
    headline: "OpenAI GPT-5 achieves human-level performance on 95% of professional licensing exams",
    source: "The Verge",
    sourceType: "trusted",
    category: "Technology",
    time: "1h ago",
    excerpt: "OpenAI's internal evaluation report, published alongside the model launch, shows GPT-5 passing bar exams, medical boards, and CPA tests at rates exceeding 90th percentile human scores.",
    verdict: "MOSTLY_TRUE",
    score: 78,
    checking: false,
    breaking: false,
  },
  {
    id: "ln-11",
    headline: "Major earthquake predicted for Tokyo within 48 hours by AI model",
    source: "QuakePredictAI.com",
    sourceType: "unreliable",
    category: "Science",
    time: "1h 15m ago",
    excerpt: "An AI startup claims its proprietary seismic prediction model has identified a 94% probability of a magnitude 7+ earthquake hitting greater Tokyo in the next two days.",
    verdict: "MOSTLY_FALSE",
    score: 19,
    checking: false,
    breaking: true,
  },
  {
    id: "ln-12",
    headline: "Parliament passes Digital India Data Protection Bill with bipartisan support",
    source: "The Indian Express",
    sourceType: "trusted",
    category: "Politics",
    time: "2h ago",
    excerpt: "The Lok Sabha passed the Digital Personal Data Protection Bill with amendments, establishing India's first comprehensive data protection framework.",
    verdict: "TRUE",
    score: 91,
    checking: false,
    breaking: false,
  },
];

// 3 articles that start in "checking" state and resolve over time
const INITIALLY_CHECKING = ["ln-c1", "ln-c2", "ln-c3"];

const LIVE_CHECKING = [
  {
    id: "ln-c1",
    headline: "New WhatsApp policy will charge users ₹50/month starting August",
    source: "Viral WhatsApp Forward",
    sourceType: "unverified",
    category: "Technology",
    time: "Just now",
    excerpt: "A widely forwarded WhatsApp message claims the platform is rolling out mandatory subscription fees for Indian users from August 2025.",
    verdict: "FALSE",
    score: 3,
    checking: true,
    breaking: true,
    resolveAfter: 6000,
  },
  {
    id: "ln-c2",
    headline: "NASA confirms asteroid 2029 Apophis will make closest-ever flyby next month",
    source: "Space.com",
    sourceType: "trusted",
    category: "Science",
    time: "Just now",
    excerpt: "Apophis is confirmed to make a historically close Earth pass in 2029, with NASA having updated its trajectory data following new observations.",
    verdict: "MOSTLY_TRUE",
    score: 81,
    checking: true,
    breaking: false,
    resolveAfter: 10000,
  },
  {
    id: "ln-c3",
    headline: "Opposition parties allege voting machines were hacked in recent state elections",
    source: "NDTV",
    sourceType: "trusted",
    category: "Politics",
    time: "3 min ago",
    excerpt: "Several opposition parties have filed petitions with the Election Commission claiming discrepancies in EVM data during the recent state assembly elections.",
    verdict: "MIXED",
    score: 45,
    checking: true,
    breaking: false,
    resolveAfter: 14000,
  },
];

const ALL_NEWS = [...LIVE_CHECKING, ...LIVE_NEWS];
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
  const [checkingState, setCheckingState] = useState(
    Object.fromEntries(INITIALLY_CHECKING.map((id) => [id, true])),
  );
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [ticker, setTicker] = useState(0);

  // Resolve checking articles one by one
  useEffect(() => {
    LIVE_CHECKING.forEach((item) => {
      setTimeout(() => {
        setCheckingState((prev) => ({ ...prev, [item.id]: false }));
      }, item.resolveAfter);
    });
  }, []);

  // Pulse ticker for live dot
  useEffect(() => {
    const id = setInterval(() => setTicker((p) => p + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setLastRefresh(new Date()); }, 1400);
  };

  const factCheckThis = (item) => {
    const id = createCheck(item.headline);
    setActiveCheckId(id);
    navigate("/");
  };

  const displayed = ALL_NEWS.filter(
    (n) => category === "All" || n.category === category,
  );

  const falseCount = LIVE_NEWS.filter((n) => n.verdict === "FALSE" || n.verdict === "MOSTLY_FALSE").length;
  const trueCount  = LIVE_NEWS.filter((n) => n.verdict === "TRUE"  || n.verdict === "MOSTLY_TRUE").length;
  const checkingCount = Object.values(checkingState).filter(Boolean).length;

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
              Verifying trending news from {ALL_NEWS.length} sources
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
            { label: "Trending Stories", value: ALL_NEWS.length, color: "text-slate-700 dark:text-slate-200" },
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

          {/* Breaking News Banner */}
          {displayed.filter((n) => n.breaking && !checkingState[n.id]).length > 0 && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">⚡ Breaking</span>
                <div className="flex gap-4 mt-1 overflow-x-auto">
                  {displayed
                    .filter((n) => n.breaking && !checkingState[n.id])
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
          <div className="grid grid-cols-1 gap-3">
            {displayed.map((item) => {
              const isChecking = checkingState[item.id];
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
              <p className="text-xs">SeeThru monitors 200+ news sources and social media in real time</p>
            </div>
            <p className="text-[11px] text-slate-300 dark:text-slate-600">
              AI verdicts are for informational purposes only. Always verify with primary sources.
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
