import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Newspaper,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import api from "../api/axios";

function VerdictBadge({ verdict }) {
  const map = {
    REAL: { cls: "badge-safe", icon: <ShieldCheck className="w-3.5 h-3.5" />, text: "Real" },
    FAKE: { cls: "badge-danger", icon: <ShieldAlert className="w-3.5 h-3.5" />, text: "Fake" },
    UNVERIFIED: { cls: "badge-suspicious", icon: <HelpCircle className="w-3.5 h-3.5" />, text: "Unverified" },
  };
  const v = map[verdict] || map.UNVERIFIED;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${v.cls}`}>
      {v.icon} {v.text}
    </span>
  );
}

function ArticleCard({ article, index }) {
  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-xl p-4 block hover:border-indigo-500/30 transition-all group"
    >
      <div className="flex gap-4">
        {article.urlToImage && (
          <img
            src={article.urlToImage}
            alt=""
            className="w-24 h-20 rounded-lg object-cover flex-shrink-0"
            onError={(e) => (e.target.style.display = "none")}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <VerdictBadge verdict={article.verdict} />
            {article.ai_confidence > 0 && (
              <span className="text-[10px] text-[var(--text-secondary)]">
                {Math.round(article.ai_confidence * 100)}% confident
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold leading-tight mb-1 line-clamp-2 group-hover:text-indigo-300 transition-colors">
            {article.title}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
            {article.description}
          </p>
          {article.ai_reason && (
            <p className="text-[10px] text-indigo-400/70 mt-1.5 italic line-clamp-1">
              AI: {article.ai_reason}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-[var(--text-secondary)]">
              {article.source?.name || "Unknown source"}
            </span>
            <ExternalLink className="w-3 h-3 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </motion.a>
  );
}

export default function NewsFeed() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await api.get("/news/", { params: { page_size: 15 } });
      setArticles(res.data.articles || []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filtered =
    filter === "ALL" ? articles : articles.filter((a) => a.verdict === filter);

  const counts = {
    ALL: articles.length,
    REAL: articles.filter((a) => a.verdict === "REAL").length,
    FAKE: articles.filter((a) => a.verdict === "FAKE").length,
    UNVERIFIED: articles.filter((a) => a.verdict === "UNVERIFIED").length,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">News Feed</h1>
            <p className="text-xs text-[var(--text-secondary)]">AI-classified news articles</p>
          </div>
        </div>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {["ALL", "REAL", "FAKE", "UNVERIFIED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                : "text-[var(--text-secondary)] hover:bg-white/5"
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Articles */}
      {loading ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm text-[var(--text-secondary)]">Fetching and classifying news...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-[var(--text-secondary)]">No articles found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((article, i) => (
            <ArticleCard key={i} article={article} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
