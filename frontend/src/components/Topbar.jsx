import { useState, useRef, useEffect } from "react";
import { Menu, Bell, BellOff, Check } from "lucide-react";
import { useApp } from "../context/Appcontext";

export default function Topbar({ title }) {
  const { sidebarOpen, setSidebarOpen, notifications, unreadCount, markNotificationRead, markAllRead } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const panelRef = useRef(null);

  // Close notification panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  return (
    <header className="h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-3">
        {/* Sidebar Toggle — always shown when sidebar closed */}
        <button
          onClick={() => setSidebarOpen(true)}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all ${sidebarOpen ? "lg:hidden" : "flex"}`}
          title="Open sidebar"
        >
          <Menu size={18} />
        </button>
        {/* Page Title */}
        <h1 className="font-semibold text-slate-800 dark:text-white text-sm tracking-tight">{title}</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2" ref={panelRef}>
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((p) => !p)}
            className="relative p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div className="animate-slide-up absolute right-0 top-10 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Check size={11} /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-slate-400">
                    <BellOff size={24} className="mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-start gap-3 ${!n.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                    >
                      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-slate-300 dark:bg-slate-600" : "bg-blue-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${n.read ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-white font-medium"}`}>
                          {n.text}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}