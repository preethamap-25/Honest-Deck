import { useState } from "react";
import {
  User,
  Mail,
  Calendar,
  Edit3,
  Check,
  X,
  Camera,
  Shield,
  Crown,
  Zap,
} from "lucide-react";
import { useApp } from "../context/Appcontext";
import Topbar from "../components/Topbar";

export default function ProfilePage() {
  const { user, updateUser, chats } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    bio: user.bio,
  });

  const save = () => {
    updateUser(form);
    setEditing(false);
  };
  const cancel = () => {
    setForm({ name: user.name, email: user.email, bio: user.bio });
    setEditing(false);
  };

  const totalMessages = chats.reduce((s, c) => s + c.messages.length, 0);
  const usagePct = Math.round(
    (user.usage.tokensUsed / user.usage.tokensLimit) * 100,
  );

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Profile" />
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Avatar + name card */}
        <div className="bg-white rounded-2xl border border-blue-100 p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {user.initials}
              </div>
              <button className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-blue-200 rounded-full flex items-center justify-center shadow hover:bg-blue-50 transition-all">
                <Camera size={12} className="text-blue-500" />
              </button>
            </div>

            {editing ? (
              <div className="w-full space-y-3">
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full text-center font-bold text-slate-800 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <input
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  className="w-full text-center bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-600"
                />
                <textarea
                  value={form.bio}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, bio: e.target.value }))
                  }
                  rows={2}
                  className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-600 resize-none"
                />
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={save}
                    className="flex items-center gap-1.5 bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-all active:scale-95"
                  >
                    <Check size={14} /> Save
                  </button>
                  <button
                    onClick={cancel}
                    className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all active:scale-95"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-display font-bold text-lg text-slate-800">
                  {user.name}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
                <p className="text-sm text-slate-600 mt-2 max-w-xs leading-relaxed">
                  {user.bio}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                    <Crown size={11} /> {user.plan} Plan
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={11} /> Joined {user.joined}
                  </span>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="mt-4 flex items-center gap-1.5 text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors"
                >
                  <Edit3 size={14} /> Edit Profile
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Chats", value: chats.length },
            { label: "Messages", value: totalMessages },
            { label: "Pinned", value: chats.filter((c) => c.pinned).length },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-blue-100 p-4 text-center"
            >
              <p className="text-xl font-bold text-blue-600">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Plan & Usage */}
        <div className="bg-white rounded-2xl border border-blue-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown size={15} className="text-blue-500" />
              <h3 className="font-semibold text-sm text-slate-800">
                Your Plan
              </h3>
            </div>
            <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              {user.plan}
            </span>
          </div>
          <div className="space-y-2.5">
            {[
              {
                label: "Tokens used",
                value: `${(user.usage.tokensUsed / 1000).toFixed(0)}k / ${(user.usage.tokensLimit / 1000).toFixed(0)}k`,
                pct: usagePct,
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>{item.label}</span>
                  <span className="font-medium text-slate-700">
                    {item.value}
                  </span>
                </div>
                <div className="w-full bg-blue-50 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${item.pct > 80 ? "bg-orange-400" : "bg-blue-400"}`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <Zap size={14} /> Upgrade to Enterprise
          </button>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl border border-blue-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={15} className="text-blue-500" />
            <h3 className="font-semibold text-sm text-slate-800">Security</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: "Change Password", desc: "Last changed 30 days ago" },
              {
                label: "Two-Factor Auth",
                desc: "Not enabled",
                action: "Enable",
              },
              {
                label: "Active Sessions",
                desc: "2 devices logged in",
                action: "Manage",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2 border-b border-blue-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
                {item.action && (
                  <button className="text-xs text-blue-500 hover:text-blue-700 font-semibold transition-colors">
                    {item.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <h3 className="font-semibold text-sm text-red-700 mb-2">
            Danger Zone
          </h3>
          <p className="text-xs text-red-500 mb-3">
            These actions are irreversible. Please be certain.
          </p>
          <div className="flex gap-2">
            <button className="flex-1 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition-all">
              Clear All Chats
            </button>
            <button className="flex-1 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-all">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
