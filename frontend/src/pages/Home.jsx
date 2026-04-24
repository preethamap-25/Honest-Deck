import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Newspaper,
  ExternalLink,
  HelpCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import api from "../api/axios";
import AnalyzerPanel from "../components/AnalyzerPanel";

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

function NewsSection() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await api.get("/news/", { params: { page_size: 6 } });
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

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-indigo-400" /> Live News Feed
        </h2>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : articles.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] text-center py-6">
          No news articles available.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {articles.map((article, i) => (
            <motion.a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 border border-transparent hover:border-indigo-500/20 transition-all group"
            >
              {article.urlToImage && (
                <img
                  src={article.urlToImage}
                  alt=""
                  className="w-20 h-16 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => (e.target.style.display = "none")}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <VerdictBadge verdict={article.verdict} />
                  {article.ai_confidence > 0 && (
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {Math.round(article.ai_confidence * 100)}%
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-semibold leading-tight line-clamp-2 group-hover:text-indigo-300 transition-colors">
                  {article.title}
                </h3>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {article.source?.name || "Unknown"}
                  </span>
                  <ExternalLink className="w-3 h-3 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            Detect <span className="gradient-text">Misinformation</span> Instantly
          </h1>
          <p className="text-[var(--text-secondary)] max-w-md mx-auto">
            Paste text, a URL, or drop an image — our agentic AI pipeline verifies it in seconds.
          </p>
        </motion.div>
      </div>

      {/* Analyzer */}
      <div className="mb-10">
        <AnalyzerPanel />
      </div>

      {/* Live News */}
      <NewsSection />
    </div>
  );
}
