import { useEffect, useState } from "react";
import api from "../api/axios";

export default function AlertBanner() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/alerts/");
        setAlerts(data.alerts || []);
      } catch {
        // silently ignore
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const dismiss = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts((prev) => prev.filter((a) => a.alert_id !== id));
    } catch {
      // ignore
    }
  };

  if (!alerts.length) return null;

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((alert) => (
        <div
          key={alert.alert_id}
          className="flex items-start justify-between bg-red-50 border border-red-300 rounded-xl px-4 py-3"
        >
          <div>
            <p className="text-sm font-semibold text-red-800">
              🚨 {alert.label} — {Math.round(alert.risk_score * 100)}% risk
            </p>
            <p className="text-xs text-red-600 mt-0.5 line-clamp-1">{alert.explanation}</p>
          </div>
          <button
            onClick={() => dismiss(alert.alert_id)}
            className="ml-4 text-red-400 hover:text-red-700 text-lg leading-none"
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
