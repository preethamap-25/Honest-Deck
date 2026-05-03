import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/Appcontext.jsx";
import { ToastProvider } from "./components/ToastProvider.jsx";
import RootLayout from "./components/Rootlayout.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ToastProvider>
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route element={<RootLayout />}>
              <Route index element={<ChatPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
