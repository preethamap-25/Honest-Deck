import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { mockChecks, mockUser } from "../data/mockData";

const AppContext = createContext(null);

const defaultPrefs = {
  notifMessages: true,
  notifUpdates: true,
  notifWeekly: false,
  soundEnabled: false,
  compactMode: false,
  codeLineNumbers: true,
  streamResponses: true,
  saveHistory: true,
  language: "en",
  fontSize: "medium",
  sensitivity: "balanced",
  autoScanUrls: true,
  trustedSources: ["Reuters", "AP", "BBC", "WHO", "CDC"],
};

export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(mockUser);
  const [checks, setChecks] = useState(mockChecks);
  const [activeCheckId, setActiveCheckId] = useState(mockChecks[0]?.id ?? null);
  const [theme, setTheme] = useState("light");
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [notifications, setNotifications] = useState([]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else if (theme === "system") {
      root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
    } else root.classList.remove("dark");
  }, [theme]);

  // Apply font size
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("text-sm", "text-base", "text-lg");
    const map = { small: "text-sm", medium: "text-base", large: "text-lg" };
    if (map[prefs.fontSize]) root.classList.add(map[prefs.fontSize]);
  }, [prefs.fontSize]);

  const activeCheck = checks.find((c) => c.id === activeCheckId) ?? null;

  const createCheck = useCallback((title = "New Fact-Check") => {
    const id = `check-${Date.now()}`;
    const newCheck = {
      id, title,
      verdict: null,
      score: null,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
      tags: [],
    };
    setChecks((prev) => [newCheck, ...prev]);
    setActiveCheckId(id);
    return id;
  }, []);

  const deleteCheck = useCallback((id) => {
    setChecks((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeCheckId === id) setActiveCheckId(next[0]?.id ?? null);
      return next;
    });
  }, [activeCheckId]);

  const renameCheck = useCallback((id, title) => {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  const togglePin = useCallback((id) => {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)));
  }, []);

  const addMessage = useCallback((checkId, message) => {
    setChecks((prev) =>
      prev.map((c) => {
        if (c.id !== checkId) return c;

        // Extract verdict/score from assistant message if present
        let verdict = c.verdict;
        let score = c.score;
        let title = c.title;

        if (message.role === "assistant") {
          try {
            const match = message.content.match(/FACT_CHECK_START\n([\s\S]*?)\nFACT_CHECK_END/);
            if (match) {
              const parsed = JSON.parse(match[1]);
              verdict = parsed.verdict;
              score = parsed.score;
            }
          } catch { /* ignore */ }
        }

        if (message.role === "user" && c.messages.length === 0) {
          title = message.content.slice(0, 60) + (message.content.length > 60 ? "…" : "");
        }

        return {
          ...c,
          messages: [...c.messages, message],
          updatedAt: new Date().toISOString(),
          verdict,
          score,
          title,
        };
      }),
    );
  }, []);

  const updateUser = useCallback((patch) => setUser((p) => ({ ...p, ...patch })), []);
  const updatePref = useCallback((key, value) => setPrefs((p) => ({ ...p, [key]: value })), []);
  const markNotificationRead = useCallback((id) => {
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);
  const markAllRead = useCallback(() => {
    setNotifications((p) => p.map((n) => ({ ...n, read: true })));
  }, []);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider value={{
      sidebarOpen, setSidebarOpen,
      user, updateUser,
      checks, activeCheckId, setActiveCheckId, activeCheck,
      createCheck, deleteCheck, renameCheck, togglePin, addMessage,
      theme, setTheme,
      prefs, updatePref,
      notifications, unreadCount, markNotificationRead, markAllRead,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
};
