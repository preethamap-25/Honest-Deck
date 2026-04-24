import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/Appcontext.jsx";
import RootLayout from "./components/Rootlayout.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<ChatPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            {/* ➕ Add new pages here — the layout wraps them automatically */}
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
