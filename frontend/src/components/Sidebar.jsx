import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Shield, Settings, BookOpen,
  Newspaper, Plus, Pin, Trash2, Search,
  Pencil, Check, PanelLeft,
} from "lucide-react";
import { useApp } from "../context/Appcontext";
import { getVerdict } from "../data/verdictConfig";

const NAV_ITEMS = [
  { to: "/dashboard", icon: Newspaper, label: "Live News" },
  { to: "/history", icon: BookOpen, label: "History" },
];

export default function Sidebar() {
  const {
    sidebarOpen, setSidebarOpen,
    user, checks, activeCheckId, setActiveCheckId,
    createCheck, deleteCheck, renameCheck, togglePin,
  } = useApp();

  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState("");

  const filtered = checks.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );
  const pinned = filtered.filter((c) => c.pinned);
  const recent = filtered.filter((c) => !c.pinned);

  const handleNew = () => { createCheck("New Fact-Check"); navigate("/"); };

  const startRename = (e, check) => {
    e.stopPropagation();
    setRenamingId(check.id);
    setRenameVal(check.title);
  };

  const commitRename = (id) => {
    if (renameVal.trim()) renameCheck(id, renameVal.trim());
    setRenamingId(null);
  };

  if (!sidebarOpen) return null;

  return (
    <aside className="animate-slide-in flex flex-col w-72 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-lg z-20 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          {/* <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md">
            <Shield size={16} className="text-white" />
          </div> */}
          <div>
            <span className="font-display font-bold text-base text-slate-800 dark:text-white tracking-tight">
              SeeThru
            </span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
        >
          <PanelLeft size={16} />
        </button>
      </div>


      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fact-checks…"
            className="w-full pl-8 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
          />
        </div>
      </div>

      {/* New Check */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={handleNew}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98] shadow-sm"
        >
          <Plus size={16} />
          New Fact-Check
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-3 pb-3 border-b border-slate-100 dark:border-slate-800 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => ( // eslint-disable-line no-unused-vars
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer
              ${isActive
                ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Check History */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {pinned.length > 0 && (
          <CheckGroup
            label="Pinned"
            checks={pinned}
            activeCheckId={activeCheckId}
            setActiveCheckId={setActiveCheckId}
            navigate={navigate}
            renamingId={renamingId}
            renameVal={renameVal}
            setRenameVal={setRenameVal}
            startRename={startRename}
            commitRename={commitRename}
            deleteCheck={deleteCheck}
            togglePin={togglePin}
          />
        )}
        <CheckGroup
          label="Recent"
          checks={recent}
          activeCheckId={activeCheckId}
          setActiveCheckId={setActiveCheckId}
          navigate={navigate}
          renamingId={renamingId}
          renameVal={renameVal}
          setRenameVal={setRenameVal}
          startRename={startRename}
          commitRename={commitRename}
          deleteCheck={deleteCheck}
          togglePin={togglePin}
        />
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs">No fact-checks found</div>
        )}
      </div>

      {/* Profile Footer */}
      <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-3 flex items-center gap-2">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer flex-1 min-w-0
            ${isActive ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`
          }
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </NavLink>
        {/* Settings icon beside name */}
        <NavLink
          to="/settings"
          title="Settings"
          className={({ isActive }) =>
            `shrink-0 p-2 rounded-xl transition-all
            ${isActive ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"}`
          }
        >
          <Settings size={16} />
        </NavLink>
      </div>
    </aside>
  );
}

function CheckGroup({ label, checks, activeCheckId, setActiveCheckId, navigate, renamingId, renameVal, setRenameVal, startRename, commitRename, deleteCheck, togglePin }) {
  if (!checks.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">{label}</p>
      <div className="space-y-0.5">
        {checks.map((check) => (
          <CheckItem
            key={check.id}
            check={check}
            isActive={check.id === activeCheckId}
            isRenaming={renamingId === check.id}
            renameVal={renameVal}
            setRenameVal={setRenameVal}
            onSelect={() => { setActiveCheckId(check.id); navigate("/"); }}
            onRenameStart={(e) => startRename(e, check)}
            onRenameCommit={() => commitRename(check.id)}
            onDelete={(e) => { e.stopPropagation(); deleteCheck(check.id); }}
            onTogglePin={(e) => { e.stopPropagation(); togglePin(check.id); }}
          />
        ))}
      </div>
    </div>
  );
}

function CheckItem({ check, isActive, isRenaming, renameVal, setRenameVal, onSelect, onRenameStart, onRenameCommit, onDelete, onTogglePin }) {
  const renameRef = useRef(null);
  useEffect(() => { if (isRenaming) renameRef.current?.focus(); }, [isRenaming]);

  const vc = check.verdict ? getVerdict(check.verdict) : null;

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-start gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all
        ${isActive ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
    >
      {/* Verdict dot */}
      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${vc ? vc.dot : "bg-slate-300 dark:bg-slate-600"}`} />

      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              ref={renameRef}
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") onRenameCommit(); }}
              className="flex-1 text-xs bg-white dark:bg-slate-700 border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 text-slate-800 dark:text-white"
            />
            <button onClick={onRenameCommit} className="text-blue-500"><Check size={12} /></button>
          </div>
        ) : (
          <p className={`text-xs truncate leading-tight ${isActive ? "text-blue-800 dark:text-blue-300 font-semibold" : "text-slate-700 dark:text-slate-300"}`}>
            {check.title}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {vc && (
            <span className={`text-[9px] font-bold uppercase ${vc.text}`}>{vc.label}</span>
          )}
          {check.score !== null && check.score !== undefined && (
            <span className="text-[9px] text-slate-400">{check.score}/100</span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isRenaming && (
        <div className="absolute right-2 top-1.5 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-1 py-0.5 shadow-sm">
          <button onClick={onRenameStart} className="p-0.5 rounded text-slate-400 hover:text-blue-500"><Pencil size={11} /></button>
          <button onClick={onTogglePin} className={`p-0.5 rounded ${check.pinned ? "text-blue-500" : "text-slate-400 hover:text-blue-500"}`}><Pin size={11} /></button>
          <button onClick={onDelete} className="p-0.5 rounded text-slate-400 hover:text-red-500"><Trash2 size={11} /></button>
        </div>
      )}
    </div>
  );
}
