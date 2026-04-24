import { createContext, useContext, useState, useCallback, useEffect } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [checks, setChecks] = useState([]);
  const [activeCheckId, setActiveCheckId] = useState(null);
  const [theme, setTheme] = useState("light");
  const [prefs, setPrefs] = useState({});
  const [notifications, setNotifications] = useState([]);

  // Fetch initial data
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Fetch User & Prefs
        const userRes = await fetch("/api/user");
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.profile);
          setPrefs(userData.prefs);
        }

        // Fetch Checks
        const checksRes = await fetch("/api/checks");
        if (checksRes.ok) {
          const checksData = await checksRes.json();
          setChecks(checksData);
          if (checksData.length > 0) {
            setActiveCheckId(checksData[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    }
    loadInitialData();
  }, []);

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
    if (!prefs.fontSize) return;
    const root = document.documentElement;
    root.classList.remove("text-sm", "text-base", "text-lg");
    const map = { small: "text-sm", medium: "text-base", large: "text-lg" };
    if (map[prefs.fontSize]) root.classList.add(map[prefs.fontSize]);
  }, [prefs.fontSize]);

  const activeCheck = checks.find((c) => c.id === activeCheckId) ?? null;

  const createCheck = useCallback(async (title = "New Fact-Check") => {
    try {
      const res = await fetch("/api/checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      if (res.ok) {
        const newCheck = await res.json();
        setChecks((prev) => [newCheck, ...prev]);
        setActiveCheckId(newCheck.id);
        return newCheck.id;
      }
    } catch (error) {
      console.error("Failed to create check", error);
    }
    return null;
  }, []);

  const deleteCheck = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/checks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setChecks((prev) => {
          const next = prev.filter((c) => c.id !== id);
          if (activeCheckId === id) setActiveCheckId(next[0]?.id ?? null);
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to delete check", error);
    }
  }, [activeCheckId]);

  const renameCheck = useCallback(async (id, title) => {
    try {
      const res = await fetch(`/api/checks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      if (res.ok) {
        const updated = await res.json();
        setChecks((prev) => prev.map((c) => (c.id === id ? updated : c)));
      }
    } catch (error) {
      console.error("Failed to rename check", error);
    }
  }, []);

  const togglePin = useCallback(async (id) => {
    const check = checks.find(c => c.id === id);
    if (!check) return;
    try {
      const res = await fetch(`/api/checks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !check.pinned })
      });
      if (res.ok) {
        const updated = await res.json();
        setChecks((prev) => prev.map((c) => (c.id === id ? updated : c)));
      }
    } catch (error) {
      console.error("Failed to toggle pin", error);
    }
  }, [checks]);

  // addMessage now just updates the local state optimism, but it shouldn't be the main way to submit. 
  // It's used by the polling/websocket in the future or direct push.
  const addMessage = useCallback((checkId, message) => {
    setChecks((prev) =>
      prev.map((c) => {
        if (c.id !== checkId) return c;

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

  // Update user on backend
  const updateUser = useCallback(async (patch) => {
    setUser((p) => ({ ...p, ...patch }));
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
    } catch (e) { console.error("Failed to update user", e) }
  }, []);

  // Update prefs on backend
  const updatePref = useCallback(async (key, value) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    try {
      await fetch("/api/user/prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });
    } catch (e) { console.error("Failed to update prefs", e) }
  }, []);

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
      setChecks, // Adding setChecks so hooks can refresh data
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
