import { useState } from "react";
import { Shield, Mail, Calendar, Edit3, Check, X, Camera, TrendingDown } from "lucide-react";
import { useApp } from "../context/Appcontext";
import { useToast } from "../components/ToastProvider";
import Topbar from "../components/Topbar";

export default function ProfilePage() {
  const { user, updateUser, checks } = useApp();
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user.name, email: user.email, bio: user.bio });

  const save = () => { updateUser(form); setEditing(false); addToast("Profile saved successfully!", "success"); };
  const cancel = () => { setForm({ name: user.name, email: user.email, bio: user.bio }); setEditing(false); };

  const totalChecks = checks.length;
  const falseCount = checks.filter((c) => c.verdict === "FALSE" || c.verdict === "MOSTLY_FALSE").length;
  const trueCount = checks.filter((c) => c.verdict === "TRUE" || c.verdict === "MOSTLY_TRUE").length;
  const checksRun = user.usage?.checksRun ?? totalChecks;

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Profile" />
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* Avatar Card */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {user.initials}
              </div>
              <button
                onClick={() => addToast("Avatar upload coming soon!", "info")}
                className="absolute bottom-0 right-0 w-7 h-7 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center shadow hover:bg-blue-50 transition-all"
              >
                <Camera size={12} className="text-blue-500" />
              </button>
            </div>

            {editing ? (
              <div className="w-full space-y-3">
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Full name"
                  className="w-full text-center font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email address"
                  className="w-full text-center bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-600 dark:text-slate-300" />
                <textarea value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} placeholder="A short bio…" rows={2}
                  className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-600 dark:text-slate-300 resize-none" />
                <div className="flex gap-2 justify-center">
                  <button onClick={save} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all active:scale-95">
                    <Check size={14} /> Save
                  </button>
                  <button onClick={cancel} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all active:scale-95">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-display font-bold text-lg text-slate-800 dark:text-white">{user.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Mail size={12} /> {user.email}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xs leading-relaxed">{user.bio}</p>
                <span className="mt-3 text-xs text-slate-400 flex items-center gap-1">
                  <Calendar size={11} /> Joined {user.joined}
                </span>
                <button onClick={() => setEditing(true)} className="mt-4 flex items-center gap-1.5 text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors">
                  <Edit3 size={14} /> Edit Profile
                </button>
              </>
            )}
          </div>
        </div>

        {/* Fact-Check Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Checks", value: checksRun, icon: Shield, color: "text-blue-500" },
            { label: "False Caught", value: falseCount, icon: TrendingDown, color: "text-red-500" },
            { label: "Verified True", value: trueCount, icon: Check, color: "text-emerald-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-center">
              <s.icon size={18} className={`${s.color} mx-auto mb-1`} />
              <p className="text-xl font-bold text-slate-800 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Account Settings */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <h3 className="font-semibold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <Shield size={14} className="text-blue-500" /> Security
          </h3>
          {[
            { label: "Change Password", desc: "Last changed 30 days ago", action: "Change", onClick: () => addToast("Password change coming soon.", "info") },
            { label: "Two-Factor Auth", desc: "Not enabled", action: "Enable", onClick: () => addToast("2FA setup coming soon.", "info") },
            { label: "Active Sessions", desc: "2 devices logged in", action: "Manage", onClick: () => addToast("Session management coming soon.", "info") },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
              <button onClick={item.onClick} className="text-xs text-blue-500 hover:text-blue-700 font-semibold transition-colors">
                {item.action}
              </button>
            </div>
          ))}
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-2xl p-4">
          <h3 className="font-semibold text-sm text-red-700 dark:text-red-400 mb-2">Danger Zone</h3>
          <div className="flex gap-2">
            <button onClick={() => addToast("All fact-checks cleared.", "warning")}
              className="flex-1 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all">
              Clear All Checks
            </button>
            <button onClick={() => addToast("Account deletion disabled in demo mode.", "error")}
              className="flex-1 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-all">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
