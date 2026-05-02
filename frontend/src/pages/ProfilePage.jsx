import { useApp } from "../context/Appcontext";
import Topbar from "../components/Topbar";
import { LogOut, User, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { authUser, logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Profile" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto p-6 space-y-6">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {authUser?.username?.[0]?.toUpperCase() || "U"}
            </div>
          </div>

          {/* User Info */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold mb-1">Username</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <User size={18} />
                {authUser?.username || "Admin"}
              </p>
            </div>

            {authUser?.email && (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold mb-1">Email</p>
                <p className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <Mail size={18} />
                  {authUser.email}
                </p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
