import { useState } from "react";
import api from "../api/axios";

export default function URLAnalyzer({ onResult }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/analyze/url", { url });
      onResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "URL analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span className="text-2xl">🔗</span> URL Analyzer
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/suspicious-article"
          className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="self-end bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          {loading ? "Checking…" : "Check URL"}
        </button>
      </form>
    </div>
  );
}
