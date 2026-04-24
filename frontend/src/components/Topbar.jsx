import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  MessageSquare, LayoutDashboard, Settings, User, Bell,
  Plus, Pin, Trash2, X, ChevronRight, Search, Sparkles,
  BarChart2, BookOpen, Pencil, Check,
} from "lucide-react";
import { useApp } from "../context/Appcontext";
import { TAG_COLORS } from "../data/mockData";

const NAV_ITEMS = [
  { to: "/", icon: MessageSquare, label: "Chat" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/history", icon: BookOpen, label: "History" },
  { to: "/analytics", icon: BarChart2, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const {
    sidebarOpen, setSidebarOpen,
    user, chats,
    activeChatId, setActiveChatId,
    createChat, deleteChat, renameChat, togglePin,
    unreadCount,
  } = useApp();

  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState("");

  if (!sidebarOpen) return null;

  const filtered = chats.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter((c) => c.pinned);
  const recent = filtered.filter((c) => !c.pinned);

  const handleNewChat = () => {
    const id = createChat("New Chat");
    navigate("/");
  };

  const startRename = (e, chat) => {
    e.stopPropagation();
    setRenamingId(chat.id);
    setRenameVal(chat.title);
  };

  const commitRename = (id) => {
    if (renameVal.trim()) renameChat(id, renameVal.trim());
    setRenamingId(null);
  };

  return (
    <aside className="animate-slide-in flex flex-col w-72 h-full bg-white border-r border-blue-100 shadow-[4px_0_24px_rgba(10,128,245,0.06)] z-20 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-blue-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg text-slate-800 tracking-tight">Seethru</span>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-slate-600 transition-all">
          <X size={16} />
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 pt-3 pb-2">
        <button onClick={handleNewChat} className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98] shadow-sm">
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="w-full pl-8 pr-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400 text-slate-700"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 pb-3 border-b border-blue-50 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer
              ${isActive
                ? "bg-blue-100 text-blue-700 font-semibold"
                : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? "text-blue-600" : "text-slate-400"} />
                <span>{label}</span>
                {label === "Settings" && unreadCount > 0 && (
                  <span className="ml-auto w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {pinned.length > 0 && (
          <ChatGroup label="Pinned" chats={pinned} activeChatId={activeChatId}
            setActiveChatId={setActiveChatId} navigate={navigate}
            renamingId={renamingId} renameVal={renameVal} setRenameVal={setRenameVal}
            startRename={startRename} commitRename={commitRename}
            deleteChat={deleteChat} togglePin={togglePin} />
        )}
        <ChatGroup label="Recent" chats={recent} activeChatId={activeChatId}
          setActiveChatId={setActiveChatId} navigate={navigate}
          renamingId={renamingId} renameVal={renameVal} setRenameVal={setRenameVal}
          startRename={startRename} commitRename={commitRename}
          deleteChat={deleteChat} togglePin={togglePin} />
      </div>

      {/* Profile Footer */}
      <div className="border-t border-blue-50 px-3 py-3">
        <NavLink to="/profile" className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer
          ${isActive ? "bg-blue-100" : "hover:bg-blue-50"}`
        }>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
          <span className="badge bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full font-medium">{user.plan}</span>
        </NavLink>
      </div>
    </aside>
  );
}

function ChatGroup({ label, chats, activeChatId, setActiveChatId, navigate,
  renamingId, renameVal, setRenameVal, startRename, commitRename, deleteChat, togglePin }) {
  if (!chats.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">{label}</p>
      <div className="space-y-0.5">
        {chats.map((chat) => (
          <ChatItem key={chat.id} chat={chat}
            isActive={chat.id === activeChatId}
            isRenaming={renamingId === chat.id}
            renameVal={renameVal} setRenameVal={setRenameVal}
            onSelect={() => { setActiveChatId(chat.id); navigate("/"); }}
            onRenameStart={(e) => startRename(e, chat)}
            onRenameCommit={() => commitRename(chat.id)}
            onDelete={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
            onTogglePin={(e) => { e.stopPropagation(); togglePin(chat.id); }}
          />
        ))}
      </div>
    </div>
  );
}

function ChatItem({ chat, isActive, isRenaming, renameVal, setRenameVal,
  onSelect, onRenameStart, onRenameCommit, onDelete, onTogglePin }) {
  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-start gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all
        ${isActive ? "bg-blue-100" : "hover:bg-slate-50"}`}
    >
      <MessageSquare size={14} className={`mt-0.5 shrink-0 ${isActive ? "text-blue-500" : "text-slate-400"}`} />
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onRenameCommit(); if (e.key === "Escape") onRenameCommit(); }}
              className="flex-1 text-xs bg-white border border-blue-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
            <button onClick={onRenameCommit} className="text-blue-500 hover:text-blue-700"><Check size={12} /></button>
          </div>
        ) : (
          <p className={`text-xs truncate leading-tight ${isActive ? "text-blue-800 font-semibold" : "text-slate-700"}`}>
            {chat.title}
          </p>
        )}
        <p className="text-[10px] text-slate-400 mt-0.5">
          {new Date(chat.updatedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
        </p>
      </div>
      {/* Actions */}
      {!isRenaming && (
        <div className="absolute right-2 top-1.5 hidden group-hover:flex items-center gap-0.5 bg-white border border-blue-100 rounded-lg px-1 py-0.5 shadow-sm">
          <button onClick={onRenameStart} className="p-0.5 rounded text-slate-400 hover:text-blue-500 transition-colors"><Pencil size={11} /></button>
          <button onClick={onTogglePin} className={`p-0.5 rounded transition-colors ${chat.pinned ? "text-blue-500" : "text-slate-400 hover:text-blue-500"}`}><Pin size={11} /></button>
          <button onClick={onDelete} className="p-0.5 rounded text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
        </div>
      )}
    </div>
  );
}