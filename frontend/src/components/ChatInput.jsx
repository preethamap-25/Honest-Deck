import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Mic, Sparkles } from "lucide-react";
import { MODELS } from "../data/mockData";

export default function ChatInput({ onSend, disabled, model, onModelChange }) {
  const [value, setValue] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const textareaRef = useRef(null);

  const currentModel = MODELS.find((m) => m.name === model) || MODELS[0];

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const autoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
    setValue(e.target.value);
  };

  return (
    <div className="relative bg-white border border-blue-100 rounded-2xl shadow-lg overflow-hidden">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={autoResize}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder="Ask Seethru anything…"
        rows={1}
        className="w-full resize-none px-4 pt-3.5 pb-12 text-sm text-slate-700 placeholder:text-slate-400
                   focus:outline-none bg-transparent leading-relaxed disabled:opacity-60"
        style={{ minHeight: 52 }}
      />

      {/* Bottom toolbar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-3 pb-2.5">
        <div className="flex items-center gap-1">
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setModelOpen((p) => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium transition-all"
            >
              <Sparkles size={12} />
              {currentModel.name}
              <span className="text-blue-400">▾</span>
            </button>
            {modelOpen && (
              <div className="absolute bottom-9 left-0 w-56 bg-white border border-blue-100 rounded-xl shadow-xl overflow-hidden z-50">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onModelChange?.(m.name);
                      setModelOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors
                      ${currentModel.id === m.id ? "bg-blue-50" : ""}`}
                  >
                    <span className="text-lg">{m.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {m.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {m.description}
                      </p>
                    </div>
                    {currentModel.id === m.id && (
                      <span className="ml-auto text-blue-500 text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all">
            <Paperclip size={15} />
          </button>
          <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all">
            <Mic size={15} />
          </button>
        </div>

        {/* Send */}
        <button
          onClick={submit}
          disabled={!value.trim() || disabled}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-500 text-white rounded-xl text-xs font-semibold
                     hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          <Send size={13} />
          Send
        </button>
      </div>
    </div>
  );
}
