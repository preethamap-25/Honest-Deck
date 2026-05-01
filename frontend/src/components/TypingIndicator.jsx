import { Sparkles } from "lucide-react";

const STAGE_ICONS = {
  "🔍": "text-blue-400",
  "📰": "text-slate-400",
  "⚖️": "text-amber-400",
  "📊": "text-purple-400",
  "📝": "text-emerald-400",
};

export default function TypingIndicator({ agentStage }) {
  const emoji = agentStage ? agentStage.split(" ")[0] : null;
  const iconClass = STAGE_ICONS[emoji] || "text-blue-400";

  return (
    <div className="flex gap-3 animate-fade-in">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-500/30 flex items-center justify-center">
        <Sparkles size={14} className="text-white" />
      </div>

      {/* Bubble */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        {agentStage ? (
          <div className="flex items-center gap-2">
            <span className={`text-sm ${iconClass}`}>{emoji}</span>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              {agentStage.slice(agentStage.indexOf(" ") + 1)}
            </p>
            <div className="flex items-center gap-1 ml-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-dot"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 h-4">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-pulse-dot"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
