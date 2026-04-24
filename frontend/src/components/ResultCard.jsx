const LABEL_CONFIG = {
  SAFE: { bg: "bg-green-500/10", border: "border-green-500/40", badge: "badge-safe", icon: "✅" },
  SUSPICIOUS: { bg: "bg-yellow-500/10", border: "border-yellow-500/40", badge: "badge-suspicious", icon: "⚠️" },
  "HIGH RISK": { bg: "bg-red-500/10", border: "border-red-500/40", badge: "badge-danger", icon: "🚨" },
  PHISHING: { bg: "bg-red-500/10", border: "border-red-500/40", badge: "badge-danger", icon: "🎣" },
  AI_GENERATED: { bg: "bg-orange-500/10", border: "border-orange-500/40", badge: "badge-suspicious", icon: "🤖" },
  MANIPULATED: { bg: "bg-orange-500/10", border: "border-orange-500/40", badge: "badge-suspicious", icon: "✂️" },
  AUTHENTIC: { bg: "bg-green-500/10", border: "border-green-500/40", badge: "badge-safe", icon: "✅" },
};

function RiskBar({ score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 75 ? "bg-red-500" : pct >= 45 ? "bg-yellow-400" : "bg-green-500";
  return (
    <div className="w-full bg-white/5 rounded-full h-2 mt-1">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ResultCard({ result }) {
  if (!result) return null;
  const cfg = LABEL_CONFIG[result.label] || LABEL_CONFIG["SUSPICIOUS"];
  const pct = Math.round((result.risk_score || 0) * 100);

  return (
    <div className={`${cfg.bg} border-l-4 ${cfg.border} rounded-2xl p-6 mt-4`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{cfg.icon}</span>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${cfg.badge}`}>
          {result.label}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
          <span>Risk Score</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <RiskBar score={result.risk_score} />
      </div>

      <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">{result.explanation}</p>

      {result.alert_triggered && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3 text-red-400 text-xs font-medium">
          🔔 High-risk alert triggered — email notification sent.
        </div>
      )}

      {result.evidence && result.evidence.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]">
            View supporting evidence ({result.evidence.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {result.evidence.map((e, i) => (
              <li key={i} className="bg-white/5 rounded-lg p-2 text-xs text-[var(--text-secondary)] border border-[var(--border)]">
                <span className="font-medium text-indigo-400">{e.source}</span>: {e.snippet}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
