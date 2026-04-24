import { Sparkles } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full shrink-0 bg-gradient-to-br from-slate-100 to-blue-100 border border-blue-200 flex items-center justify-center">
        <Sparkles size={14} className="text-blue-600" />
      </div>
      <div className="bg-white border border-blue-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1 h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-blue-400 animate-pulse-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
