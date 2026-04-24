import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  FileText,
  Link2,
  Image,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import api from "../api/axios";

const TYPE_ICON = {
  text: FileText,
  url: Link2,
  image: Image,
};

const LABEL_BADGE = {
  SAFE: { cls: "badge-safe", icon: ShieldCheck },
  SUSPICIOUS: { cls: "badge-suspicious", icon: AlertTriangle },
  "HIGH RISK": { cls: "badge-danger", icon: ShieldAlert },
};

export default function History() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/analyze/history");
        setAnalyses(data.analyses || []);
      } catch {
        // endpoint may not be available
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <Clock className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Analysis History</h1>
          <p className="text-xs text-[var(--text-secondary)]">Previous analyses stored in database</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shimmer h-20 rounded-xl" />
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <Clock className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3 opacity-30" />
          <p className="text-[var(--text-secondary)]">No analyses recorded yet.</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Start by analyzing some content on the home page.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {analyses.map((a, i) => {
            const TypeIcon = TYPE_ICON[a.input_type] || FileText;
            const badge = LABEL_BADGE[a.label] || LABEL_BADGE.SUSPICIOUS;
            const BadgeIcon = badge.icon;

            return (
              <motion.div
                key={a.analysis_id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <TypeIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-1">{a.content_preview || a.explanation}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                    {a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                  <BadgeIcon className="w-3 h-3" /> {a.label}
                </span>
                <span className="text-sm font-bold tabular-nums w-12 text-right"
                  style={{
                    color: a.risk_score >= 0.75 ? "var(--danger)" : a.risk_score >= 0.45 ? "var(--suspicious)" : "var(--safe)",
                  }}
                >
                  {Math.round((a.risk_score || 0) * 100)}%
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
