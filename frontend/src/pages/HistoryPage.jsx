import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Trash2, Pin, ArrowRight, Shield } from "lucide-react";
import { useApp } from "../context/Appcontext";
import Topbar from "../components/Topbar";
import { getVerdict, VERDICT_ORDER, TAG_COLORS } from "../data/verdictConfig";

const VERDICT_FILTERS = ["All", ...VERDICT_ORDER];

export default function HistoryPage() {
  const { checks, setActiveCheckId, deleteCheck, togglePin } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeVerdict, setActiveVerdict] = useState("All");
  const [sort, setSort] = useState("recent");

  const filtered = checks
    .filter((c) => {
      const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
      const matchVerdict = activeVerdict === "All" || c.verdict === activeVerdict;
      return matchSearch && matchVerdict;
    })
    .sort((a, b) => {
      if (sort === "recent") return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (sort === "oldest") return new Date(a.updatedAt) - new Date(b.updatedAt);
      if (sort === "score-high") return (b.score ?? 0) - (a.score ?? 0);
      if (sort === "score-low") return (a.score ?? 100) - (b.score ?? 100);
      return 0;
    });

  const openCheck = (id) => { setActiveCheckId(id); navigate("/"); };

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Fact-Check History" />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* Search + Sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fact-checks…"
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="score-high">Highest Score</option>
            <option value="score-low">Lowest Score</option>
          </select>
        </div>

        {/* Verdict filter chips */}
        <div className="flex gap-2 flex-wrap">
          {VERDICT_FILTERS.map((v) => {
            const vc = v !== "All" ? getVerdict(v) : null;
            return (
              <button
                key={v}
                onClick={() => setActiveVerdict(v)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all
                  ${activeVerdict === v
                    ? vc ? `${vc.badge} text-white` : "bg-slate-800 text-white dark:bg-white dark:text-slate-800"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-600"
                  }`}
              >
                {v === "All" ? "All" : (vc?.label ?? v)}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-slate-400">{filtered.length} fact-check{filtered.length !== 1 ? "s" : ""}</p>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Shield size={32} className="text-blue-200 dark:text-blue-800 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">No fact-checks found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((check) => {
              const vc = check.verdict ? getVerdict(check.verdict) : null;
              return (
                <div
                  key={check.id}
                  className="flex items-start gap-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-700 rounded-xl p-4 cursor-pointer transition-all group hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => openCheck(check.id)}
                >
                  {/* Verdict badge */}
                  <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center border ${vc ? `${vc.bg} ${vc.border}` : "bg-slate-100 border-slate-200"}`}>
                    <p className={`text-[8px] font-bold uppercase tracking-wide ${vc ? vc.text : "text-slate-400"}`}>
                      {vc ? (vc.label.length > 6 ? vc.emoji : vc.label) : "—"}
                    </p>
                    {check.score !== null && check.score !== undefined && (
                      <p className={`text-sm font-bold ${vc ? vc.text : "text-slate-500"}`}>{check.score}</p>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                      {check.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(check.updatedAt).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    {check.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {check.tags.map((tag) => (
                          <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] ?? "bg-slate-100 text-slate-600"}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); togglePin(check.id); }} className={`p-1.5 rounded-lg ${check.pinned ? "text-blue-500" : "text-slate-400 hover:text-blue-500"}`}>
                      <Pin size={13} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteCheck(check.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500">
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
