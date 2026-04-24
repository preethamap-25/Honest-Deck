import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { mockChats, mockUser } from "../data/mockData";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  /* ── Sidebar ── */
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* ── User / Profile ── */
  const [user, setUser] = useState(mockUser);

  /* ── Chats ── */
  const [chats, setChats] = useState(mockChats);
  const [activeChatId, setActiveChatId] = useState(mockChats[0]?.id ?? null);

  /* ── Theme ── */
  const [theme, setTheme] = useState("light");

  /* ── Notifications ── */
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      text: "Seethru has been updated to v2.1",
      read: false,
      time: "2m ago",
    },
    {
      id: 2,
      text: "Your weekly summary is ready",
      read: false,
      time: "1h ago",
    },
    {
      id: 3,
      text: "New model available: Seethru Pro",
      read: true,
      time: "1d ago",
    },
  ]);

  /* ── Active chat object ── */
  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  /* ── Create new chat ── */
  const createChat = useCallback((title = "New Chat") => {
    const id = `chat-${Date.now()}`;
    const newChat = {
      id,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
      model: "Seethru Pro",
      tags: [],
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(id);
    return id;
  }, []);

  /* ── Delete chat ── */
  const deleteChat = useCallback(
    (id) => {
      setChats((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeChatId === id) setActiveChatId(next[0]?.id ?? null);
        return next;
      });
    },
    [activeChatId],
  );

  /* ── Rename chat ── */
  const renameChat = useCallback((id, title) => {
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  /* ── Toggle pin ── */
  const togglePin = useCallback((id) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)),
    );
  }, []);

  /* ── Add message to active chat ── */
  const addMessage = useCallback((chatId, message) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              messages: [...c.messages, message],
              updatedAt: new Date().toISOString(),
              title:
                c.messages.length === 0 && message.role === "user"
                  ? message.content.slice(0, 42) +
                    (message.content.length > 42 ? "…" : "")
                  : c.title,
            }
          : c,
      ),
    );
  }, []);

  /* ── Update user profile ── */
  const updateUser = useCallback((patch) => {
    setUser((prev) => ({ ...prev, ...patch }));
  }, []);

  /* ── Mark notification read ── */
  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        /* sidebar */
        sidebarOpen,
        setSidebarOpen,
        /* user */
        user,
        updateUser,
        /* chats */
        chats,
        activeChatId,
        setActiveChatId,
        activeChat,
        createChat,
        deleteChat,
        renameChat,
        togglePin,
        addMessage,
        /* theme */
        theme,
        setTheme,
        /* notifications */
        notifications,
        unreadCount,
        markNotificationRead,
        markAllRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
};
