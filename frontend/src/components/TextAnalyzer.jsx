import { useState } from "react";
import api from "../api/axios";

export default function TextAnalyzer({ onResult }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/analyze/text", { text });
      onResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span className="text-2xl">📝</span> Text Analyzer
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste news article, claim, or any text to verify..."
          className="w-full border border-gray-300 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="self-end bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          {loading ? "Analyzing…" : "Analyze Text"}
        </button>
      </form>
    </div>
  );
}
