import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MessageSquare,
  Trash2,
  Pin,
  ArrowRight,
  Filter,
} from "lucide-react";
import { useApp } from "../context/Appcontext";
import Topbar from "../components/Topbar";
import { TAG_COLORS } from "../data/mockData";

const ALL_TAGS = [
  "all",
  "code",
  "science",
  "travel",
  "marketing",
  "python",
  "react",
];

export default function HistoryPage() {
  const { chats, setActiveChatId, deleteChat, togglePin } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [sort, setSort] = useState("recent");

  const filtered = chats
    .filter((c) => {
      const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
      const matchTag = activeTag === "all" || c.tags?.includes(activeTag);
      return matchSearch && matchTag;
    })
    .sort((a, b) => {
      if (sort === "recent")
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (sort === "oldest")
        return new Date(a.updatedAt) - new Date(b.updatedAt);
      if (sort === "longest") return b.messages.length - a.messages.length;
      return 0;
    });

  const openChat = (id) => {
    setActiveChatId(id);
    navigate("/");
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Chat History" />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Search + Sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your chats…"
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-blue-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-white border border-blue-100 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="longest">Longest</option>
          </select>
        </div>

        {/* Tags filter */}
        <div className="flex gap-2 flex-wrap">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all
                ${
                  activeTag === tag
                    ? "bg-blue-500 text-white"
                    : "bg-white border border-blue-100 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Count */}
        <p className="text-xs text-slate-400">
          {filtered.length} conversation{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* Chat list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={32} className="text-blue-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No chats found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((chat) => (
              <div
                key={chat.id}
                className="flex items-start gap-3 bg-white hover:bg-blue-50 border border-blue-100 hover:border-blue-200 rounded-xl p-4 cursor-pointer transition-all group"
                onClick={() => openChat(chat.id)}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${chat.pinned ? "bg-blue-100" : "bg-slate-100"}`}
                >
                  {chat.pinned ? (
                    <Pin size={15} className="text-blue-600" />
                  ) : (
                    <MessageSquare size={15} className="text-slate-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                      {chat.title}
                    </p>
                    {chat.pinned && (
                      <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                        Pinned
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {chat.messages.length} messages · {chat.model} ·{" "}
                    {new Date(chat.updatedAt).toLocaleDateString("en-IN", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {chat.tags?.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {chat.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {chat.messages[0] && (
                    <p className="text-xs text-slate-400 mt-1.5 truncate italic">
                      "{chat.messages[0].content.slice(0, 60)}…"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(chat.id);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${chat.pinned ? "text-blue-500" : "text-slate-400 hover:text-blue-500"}`}
                  >
                    <Pin size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
