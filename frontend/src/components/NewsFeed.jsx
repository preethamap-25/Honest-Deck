import { useEffect, useState } from "react";
import api from "../api/axios";

export default function NewsFeed() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/news/");
        setArticles(data.articles || []);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">📰 Verified News</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span className="text-2xl">📰</span> Verified News
      </h2>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {articles.length === 0 ? (
          <p className="text-sm text-gray-400">No news articles available.</p>
        ) : (
          articles.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 items-start p-3 hover:bg-gray-50 rounded-xl transition-colors"
            >
              {a.image_url && (
                <img
                  src={a.image_url}
                  alt=""
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                  onError={(e) => e.target.classList.add("hidden")}
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 line-clamp-2">{a.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{a.source}</p>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
