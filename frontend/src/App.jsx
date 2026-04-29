import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { useEffect } from "react";
import { Shield, BarChart3, Clock, Eye } from "lucide-react";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Monitor from "./pages/Monitor";
import api from "./api/axios";

function Navbar() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
        : "text-[#8888a0] hover:text-[#f0f0f5] hover:bg-white/5"
    }`;

  return (
    <nav className="glass sticky top-0 z-50 border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-[var(--text-primary)]">SEE</span>
            <span className="gradient-text">THRU</span>
          </span>
        </NavLink>
        <div className="flex gap-1">
          <NavLink to="/" end className={linkClass}>
            <Shield className="w-4 h-4" /> Analyze
          </NavLink>
          <NavLink to="/dashboard" className={linkClass}>
            <BarChart3 className="w-4 h-4" /> Dashboard
          </NavLink>
          <NavLink to="/monitor" className={linkClass}>
            <Eye className="w-4 h-4" /> Monitor
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            <Clock className="w-4 h-4" /> History
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

function App() {
  // Clean up ephemeral DB data when the user leaves / closes the tab
  useEffect(() => {
    const cleanup = () => {
      navigator.sendBeacon(
        (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/cleanup"
      );
    };
    window.addEventListener("beforeunload", cleanup);
    return () => window.removeEventListener("beforeunload", cleanup);
  }, []);

  return (
    <BrowserRouter>
      <Navbar />
      <main className="min-h-[calc(100vh-60px)]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
