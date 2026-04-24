import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Search,
  Trash2,
} from "lucide-react";
import api from "../api/axios";

const STAT_CONFIG = [
  { key: "total", label: "Total Analyses", icon: Search, gradient: "from-indigo-500 to-purple-500" },
  { key: "high_risk", label: "High Risk", icon: ShieldAlert, gradient: "from-red-500 to-pink-500" },
  { key: "suspicious", label: "Suspicious", icon: AlertTriangle, gradient: "from-amber-500 to-orange-500" },
  { key: "safe", label: "Safe", icon: ShieldCheck, gradient: "from-emerald-500 to-teal-500" },
];

function StatCard({ config, value, index }) {
  const Icon = config.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass rounded-xl p-5"
    >
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-3 opacity-80`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-[var(--text-secondary)] mt-1">{config.label}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, high_risk: 0, suspicious: 0, safe: 0 });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes] = await Promise.all([
        api.get("/analyze/stats"),
        api.get("/alerts/"),
      ]);
      setStats(statsRes.data);
      setAlerts((alertsRes.data.alerts || []).slice(0, 10));
    } catch {
      // graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const deleteAlert = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts((prev) => prev.filter((a) => a.alert_id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-xs text-[var(--text-secondary)]">Overview of all analyses</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {STAT_CONFIG.map((c, i) => (
          <StatCard key={c.key} config={c} value={stats[c.key]} index={i} />
        ))}
      </div>

      {/* Recent alerts */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          Recent Alerts
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-14 rounded-xl" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-sm py-6 text-center">
            No high-risk alerts. Everything looks good.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <motion.div
                key={a.alert_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10 hover:border-red-500/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-300">{a.label}</p>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{a.explanation}</p>
                </div>
                <span className="text-sm font-bold text-red-400 tabular-nums">
                  {Math.round(a.risk_score * 100)}%
                </span>
                <button
                  onClick={() => deleteAlert(a.alert_id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/15 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                  title="Dismiss"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
