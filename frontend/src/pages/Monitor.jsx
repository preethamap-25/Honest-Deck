import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  FileText,
  Link2,
} from "lucide-react";
import api from "../api/axios";

const TYPE_ICON = { text: FileText, url: Link2 };
const LABEL_BADGE = {
  SAFE: { cls: "badge-safe", icon: ShieldCheck },
  SUSPICIOUS: { cls: "badge-suspicious", icon: AlertTriangle },
  "HIGH RISK": { cls: "badge-danger", icon: ShieldAlert },
};

export default function Monitor() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState("url");
  const [newContent, setNewContent] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addError, setAddError] = useState("");

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/monitor/watchlist");
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const addItem = async () => {
    if (!newContent.trim()) {
      setAddError("Content is required.");
      return;
    }
    setAddError("");
    try {
      await api.post("/monitor/watchlist", {
        input_type: newType,
        content: newContent.trim(),
        label: newLabel.trim() || null,
      });
      setNewContent("");
      setNewLabel("");
      setShowAdd(false);
      loadItems();
    } catch (err) {
      setAddError(err.response?.data?.detail || "Failed to add.");
    }
  };

  const removeItem = async (watchId) => {
    try {
      await api.delete(`/monitor/watchlist/${watchId}`);
      setItems((prev) => prev.filter((i) => i.watch_id !== watchId));
    } catch {
      // ignore
    }
  };

  const runAll = async () => {
    setRunning(true);
    try {
      await api.post("/monitor/run");
      await loadItems();
    } catch {
      // ignore
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Eye className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Continuous Monitoring</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Watchlist items are re-checked automatically
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
          <button
            onClick={runAll}
            disabled={running || items.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Checking..." : "Re-check All"}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="glass rounded-xl p-5 mb-6 space-y-3"
        >
          <div className="flex gap-2">
            {["url", "text"].map((t) => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  newType === t
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "bg-white/5 text-[var(--text-secondary)]"
                }`}
              >
                {t === "url" ? "URL" : "Text"}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={newType === "url" ? "https://example.com" : "Claim or text to monitor..."}
            className="w-full bg-white/5 border border-[var(--border)] rounded-xl p-3 text-sm"
          />
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Optional label (e.g. 'Phishing site X')"
            className="w-full bg-white/5 border border-[var(--border)] rounded-xl p-3 text-sm"
          />
          {addError && <p className="text-sm text-red-400">{addError}</p>}
          <button
            onClick={addItem}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
          >
            Add to Watchlist
          </button>
        </motion.div>
      )}

      {/* Watchlist items */}
      {loading ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm text-[var(--text-secondary)]">Loading watchlist...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <Eye className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3 opacity-30" />
          <p className="text-[var(--text-secondary)]">No items in watchlist.</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Add URLs or claims to continuously monitor for threats.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const TypeIcon = TYPE_ICON[item.input_type] || FileText;
            const lastResult = item.last_result;
            const badge = lastResult
              ? LABEL_BADGE[lastResult.label] || LABEL_BADGE.SUSPICIOUS
              : null;
            const BadgeIcon = badge?.icon || AlertTriangle;

            return (
              <motion.div
                key={item.watch_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <TypeIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{item.label}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                    {item.content}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.last_checked
                        ? `Checked ${new Date(item.last_checked).toLocaleString()}`
                        : "Never checked"}
                    </span>
                    <span>·</span>
                    <span>{item.check_count} checks</span>
                  </div>
                </div>
                {badge && lastResult && (
                  <>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}
                    >
                      <BadgeIcon className="w-3 h-3" /> {lastResult.label}
                    </span>
                    <span
                      className="text-sm font-bold tabular-nums w-12 text-right"
                      style={{
                        color:
                          lastResult.risk_score >= 0.75
                            ? "var(--danger)"
                            : lastResult.risk_score >= 0.45
                            ? "var(--suspicious)"
                            : "var(--safe)",
                      }}
                    >
                      {Math.round(lastResult.risk_score * 100)}%
                    </span>
                  </>
                )}
                {!badge && (
                  <span className="text-xs text-[var(--text-secondary)] italic">Pending</span>
                )}
                <button
                  onClick={() => removeItem(item.watch_id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/15 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
