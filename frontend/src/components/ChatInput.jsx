import { useState, useRef } from "react";
import { Send, Link, ChevronDown, Check, Zap, Image } from "lucide-react";
import { AGENT_MODES } from "../data/mockData";
import { useToast } from "./ToastProvider";

export default function NewsInput({ onSubmit, disabled, mode, onModeChange }) {
  const [value, setValue] = useState("");
  const [modeOpen, setModeOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  const currentMode = AGENT_MODES.find((m) => m.id === mode) || AGENT_MODES[0];

  const submit = () => {
    if ((!value.trim() && !imageFile) || disabled) return;
    onSubmit(value, { file: imageFile });
    setValue("");
    setImageFile(null);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        addToast("Please select an image file (PNG, JPG, etc.)", "warning");
        return;
      }
      setImageFile(file);
      addToast(`Image attached: ${file.name}`, "info");
    }
  };

  const pasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith("http")) {
        setValue(text);
        addToast("URL pasted! Click Analyse to fact-check.", "info");
      } else {
        addToast("No URL found in clipboard. Paste any news URL.", "warning");
      }
    } catch {
      addToast("Clipboard access denied. Paste manually.", "warning");
    }
  };

  return (
    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-visible">
      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        disabled={disabled}
        placeholder="Paste a news headline, article excerpt, or URL to fact-check…"
        rows={2}
        className="w-full resize-none px-4 pt-3.5 pb-14 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none bg-transparent leading-relaxed disabled:opacity-60"
        style={{ minHeight: 60 }}
      />

      {/* Bottom Toolbar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-3 pb-2.5">
        <div className="flex items-center gap-1.5">
          {/* Agent Mode Selector */}
          <div className="relative">
            <button
              onClick={() => setModeOpen((p) => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-medium transition-all"
            >
              <Zap size={12} />
              {currentMode.name}
              <ChevronDown size={11} className="text-blue-400" />
            </button>
            {modeOpen && (
              <div className="absolute bottom-9 left-0 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                {AGENT_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { onModeChange?.(m.id); setModeOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${currentMode.id === m.id ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
                  >
                    <span className="text-base">{m.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-white">{m.name}</p>
                      <p className="text-[10px] text-slate-400">{m.description}</p>
                    </div>
                    {currentMode.id === m.id && <Check size={12} className="text-blue-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Paste URL */}
          <button
            onClick={pasteUrl}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-all"
            title="Paste URL from clipboard"
          >
            <Link size={12} />
            Paste URL
          </button>

          {/* Image Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-all"
            title="Upload image for authenticity analysis"
          >
            <Image size={12} />
            {imageFile ? imageFile.name.slice(0, 12) + "…" : "Image"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={(!value.trim() && !imageFile) || disabled}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          <Send size={13} />
          {disabled ? "Analysing…" : "Analyse"}
        </button>
      </div>
    </div>
  );
}
