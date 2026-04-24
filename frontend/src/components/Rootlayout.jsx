import { Outlet } from "react-router-dom";
import { useApp } from "../context/Appcontext";
import Sidebar from "../components/Sidebar";

export default function RootLayout() {
  const { sidebarOpen } = useApp();

  return (
    <div className="flex h-screen overflow-hidden bg-blue-50">
      {/* Sidebar */}
      {sidebarOpen && <Sidebar />}

      {/* Main content area — Outlet renders the active page */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white/60 relative">
        {/* Subtle background pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 10%, #b9daff 0%, transparent 50%), radial-gradient(circle at 10% 90%, #e0efff 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10 flex flex-col h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
