import { useMemo } from "react";
import { BarChart2, TrendingDown, Shield } from "lucide-react";
import Topbar from "../components/Topbar";
import { useApp } from "../context/Appcontext";
import { getVerdict, VERDICT_ORDER } from "../data/verdictConfig";

const CHART_BARS = [3, 1, 5, 2, 4, 7, 4, 6, 3, 8, 5, 7, 4, 6];
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const CHART_START = new Date(Date.now() - TWO_WEEKS_MS).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const TOPIC_DATA = [
  { topic: "Health", count: 14, color: "bg-pink-400" },
  { topic: "Politics", count: 11, color: "bg-blue-400" },
  { topic: "Science", count: 9, color: "bg-purple-400" },
  { topic: "Climate", count: 7, color: "bg-emerald-400" },
  { topic: "Technology", count: 5, color: "bg-cyan-400" },
  { topic: "Economy", count: 3, color: "bg-orange-400" },
];

export default function AnalyticsPage() {
  const { checks } = useApp();

  const verdictCounts = useMemo(() => {
    const counts = {};
    VERDICT_ORDER.forEach((v) => { counts[v] = 0; });
    checks.forEach((c) => { if (c.verdict && counts[c.verdict] !== undefined) counts[c.verdict]++; });
    return counts;
  }, [checks]);

  const maxCount = Math.max(...Object.values(verdictCounts), 1);
  const totalChecks = checks.length;
  const falseRate = totalChecks > 0
    ? Math.round(((verdictCounts.FALSE + verdictCounts.MOSTLY_FALSE) / totalChecks) * 100)
    : 0;
  const avgScore = useMemo(() => {
    const scored = checks.filter((c) => c.score !== null && c.score !== undefined);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((sum, c) => sum + c.score, 0) / scored.length);
  }, [checks]);

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Analytics" />
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">

        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Fact-Check Analytics</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Insights into your fact-checking activity and misinformation patterns.</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Checks", value: totalChecks, sub: "all time", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/40" },
            { label: "Avg. Score", value: `${avgScore}/100`, sub: "credibility", color: "text-purple-600 bg-purple-50 dark:bg-purple-900/40" },
            { label: "False Rate", value: `${falseRate}%`, sub: "of all checks", color: "text-red-600 bg-red-50 dark:bg-red-900/40" },
          ].map((m) => (
            <div key={m.label} className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-center">
              <p className={`text-2xl font-bold ${m.color} rounded-xl px-2 py-1 inline-block mb-1`}>{m.value}</p>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{m.label}</p>
              <p className="text-[10px] text-slate-400">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Verdict Breakdown */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={15} className="text-blue-500" />
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Verdict Breakdown</h3>
          </div>
          <div className="space-y-3">
            {VERDICT_ORDER.map((v) => {
              const vc = getVerdict(v);
              const count = verdictCounts[v];
              const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
              return (
                <div key={v}>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                    <span className={`font-semibold ${vc.text}`}>{vc.label}</span>
                    <span>{count} checks</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${vc.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 size={15} className="text-blue-500" />
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Daily Fact-Checks (Last 14 Days)</h3>
          </div>
          <div className="h-40 flex items-end justify-between gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-700">
            {CHART_BARS.map((h, i) => (
              <div
                key={i}
                className="w-full bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-500 dark:hover:bg-blue-600 transition-colors rounded-t-sm group relative cursor-pointer"
                style={{ height: `${(h / 8) * 100}%` }}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white text-[10px] px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {h} check{h !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2">
            <span>{CHART_START}</span>
            <span>Today</span>
          </div>
        </div>

        {/* Topics */}
        <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={15} className="text-red-500" />
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Most Checked Topics</h3>
          </div>
          <div className="space-y-2.5">
            {TOPIC_DATA.map((t) => (
              <div key={t.topic}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{t.topic}</span>
                  <span className="text-slate-400">{t.count} checks</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${t.color} rounded-full`} style={{ width: `${(t.count / 14) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Misinformation Index */}
        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
          <h3 className="font-semibold text-lg mb-1 relative z-10">Misinformation Index</h3>
          <p className="text-red-100 text-sm mb-4 relative z-10">
            {falseRate}% of claims you checked were false or misleading.
          </p>
          <div className="h-3 bg-red-900/50 rounded-full overflow-hidden relative z-10">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${falseRate}%` }} />
          </div>
          <p className="text-xs text-red-200 mt-2 relative z-10">
            Global average: ~38% of viral claims contain misinformation.
          </p>
        </div>
      </div>
    </div>
  );
}
