import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Link2,
  Image,
} from "lucide-react";
import api from "../api/axios";

const TABS = [
  { key: "text", label: "Text", icon: FileText },
  { key: "url", label: "URL", icon: Link2 },
  { key: "image", label: "Image", icon: Image },
];

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AnalyzerPanel() {
  const [activeTab, setActiveTab] = useState("text");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const submit = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      let payload;

      if (activeTab === "text") {
        if (!textInput.trim()) throw new Error("Please enter text.");
        payload = { input_type: "text", content: textInput.trim() };
      } else if (activeTab === "url") {
        if (!urlInput.trim()) throw new Error("Please enter a URL.");
        payload = { input_type: "url", content: urlInput.trim() };
      } else {
        if (!imageFile) throw new Error("Please upload an image.");
        const content = await toBase64(imageFile);
        payload = {
          input_type: "image",
          content,
          mime_type: imageFile.type || "image/jpeg",
        };
      }

      const { data } = await api.post("/api/analyze/", payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                  : "bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Inputs */}
      {activeTab === "text" && (
        <textarea
          rows={4}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Paste a claim, news article, or any text to verify..."
          className="w-full bg-white/5 border border-[var(--border)] rounded-xl p-3 text-sm resize-none"
        />
      )}

      {activeTab === "url" && (
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://example.com/suspicious-article"
          className="w-full bg-white/5 border border-[var(--border)] rounded-xl p-3 text-sm"
        />
      )}

      {activeTab === "image" && (
        <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-6 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
          {imageFile && (
            <p className="text-xs text-[var(--text-secondary)] mt-2">{imageFile.name}</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        disabled={loading}
        onClick={submit}
        className="w-full px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
          </>
        ) : (
          "Analyze"
        )}
      </button>

      {/* Loading animation */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-4"
        >
          <div className="pulse-ring">
            <Bot className="w-8 h-8 text-indigo-400" />
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Running agent pipeline...
          </p>
          <div className="w-full max-w-xs space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-2 rounded-full" style={{ width: `${100 - i * 15}%` }} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Results */}
      {result && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 pt-2"
        >
          {/* Agent steps */}
          {result.agent_steps?.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold flex items-center gap-2">
                <Bot className="w-3.5 h-3.5" /> Agent Pipeline
              </h3>
              {result.agent_steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="font-medium text-indigo-300">{step.agent}</span>
                  <span className="text-[var(--text-secondary)]">{step.action}</span>
                  {step.detail && (
                    <span className="ml-auto text-[10px] text-[var(--text-secondary)] bg-white/5 px-1.5 py-0.5 rounded">
                      {step.detail}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Verdict + Risk */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                result.label === "SAFE"
                  ? "badge-safe"
                  : result.label === "HIGH RISK"
                  ? "badge-danger"
                  : "badge-suspicious"
              }`}
            >
              {result.label === "SAFE" ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : result.label === "HIGH RISK" ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}{" "}
              {result.label}
            </span>
            <span className="text-xs text-[var(--text-secondary)] uppercase">
              {result.input_type} analysis
            </span>
          </div>

          {/* Risk bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Risk Score</span>
              <span
                className="font-bold"
                style={{
                  color:
                    result.risk_score >= 0.75
                      ? "var(--danger)"
                      : result.risk_score >= 0.45
                      ? "var(--suspicious)"
                      : "var(--safe)",
                }}
              >
                {Math.round(result.risk_score * 100)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(result.risk_score * 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background:
                    result.risk_score >= 0.75
                      ? "var(--danger)"
                      : result.risk_score >= 0.45
                      ? "var(--suspicious)"
                      : "var(--safe)",
                }}
              />
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-white/5 rounded-xl p-4 text-sm leading-relaxed text-[var(--text-secondary)]">
            {result.explanation}
          </div>

          {/* Alert */}
          {result.alert_triggered && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs font-medium">
              🔔 High-risk alert triggered — email notification sent.
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
