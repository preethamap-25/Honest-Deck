import { Outlet } from "react-router-dom";
import { useApp } from "../context/Appcontext";
import Sidebar from "../components/Sidebar";

export default function RootLayout() {
  const { prefs } = useApp();

  return (
    <div className={`flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 ${prefs.compactMode ? "compact" : ""}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative dark:bg-slate-950">
        {/* Background gradient */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 75% 8%, #dbeafe 0%, transparent 45%), radial-gradient(circle at 10% 92%, #eff6ff 0%, transparent 45%)",
          }}
        />
        <div className="relative z-10 flex flex-col h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
