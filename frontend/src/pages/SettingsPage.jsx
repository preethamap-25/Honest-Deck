import { useState } from "react";
import {
  Settings,
  Bell,
  Palette,
  Globe,
  Keyboard,
  Download,
  Trash2,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { useApp } from "../context/Appcontext";
import Topbar from "../components/Topbar";

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${value ? "bg-blue-500" : "bg-slate-200"}`}
      style={{ height: 22, width: 40 }}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-[18px]" : ""}`}
        style={{ width: 18, height: 18 }}
      />
    </button>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-blue-50">
        <Icon size={15} className="text-blue-500" />
        <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
      </div>
      <div className="divide-y divide-blue-50">{children}</div>
    </div>
  );
}

function Row({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {desc && (
          <p className="text-xs text-slate-400 mt-0.5 leading-snug">{desc}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function LinkRow({ label, desc }) {
  return (
    <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-blue-50 transition-colors">
      <div className="text-left">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <ChevronRight size={15} className="text-slate-300" />
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, notifications: notifs } = useApp();
  const [prefs, setPrefs] = useState({
    notifMessages: true,
    notifUpdates: true,
    notifWeekly: false,
    soundEnabled: false,
    compactMode: false,
    codeLineNumbers: true,
    streamResponses: true,
    saveHistory: true,
    language: "en",
    fontSize: "medium",
  });

  const set = (key) => (val) => setPrefs((p) => ({ ...p, [key]: val }));

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" />
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Appearance */}
        <Section title="Appearance" icon={Palette}>
          <Row label="Theme" desc="Choose your preferred color scheme">
            <div className="flex gap-1.5">
              {[
                { id: "light", icon: Sun },
                { id: "dark", icon: Moon },
                { id: "system", icon: Monitor },
              ].map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                    ${theme === id ? "bg-blue-500 text-white" : "bg-blue-50 text-slate-600 hover:bg-blue-100"}`}
                >
                  <Icon size={12} />
                  {id}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Font Size" desc="Adjust the text size in chat">
            <select
              value={prefs.fontSize}
              onChange={(e) => set("fontSize")(e.target.value)}
              className="bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </Row>
          <Row label="Compact Mode" desc="Reduce spacing between messages">
            <Toggle value={prefs.compactMode} onChange={set("compactMode")} />
          </Row>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          <Row
            label="New message alerts"
            desc="Get notified when responses arrive"
          >
            <Toggle
              value={prefs.notifMessages}
              onChange={set("notifMessages")}
            />
          </Row>
          <Row
            label="Product updates"
            desc="News about new features and models"
          >
            <Toggle value={prefs.notifUpdates} onChange={set("notifUpdates")} />
          </Row>
          <Row label="Weekly digest" desc="Summary of your activity each week">
            <Toggle value={prefs.notifWeekly} onChange={set("notifWeekly")} />
          </Row>
          <Row label="Sound effects" desc="Play sounds for interactions">
            <Toggle value={prefs.soundEnabled} onChange={set("soundEnabled")} />
          </Row>
        </Section>

        {/* Chat */}
        <Section title="Chat Behavior" icon={Settings}>
          <Row
            label="Stream responses"
            desc="Show text as it generates (faster feel)"
          >
            <Toggle
              value={prefs.streamResponses}
              onChange={set("streamResponses")}
            />
          </Row>
          <Row
            label="Code line numbers"
            desc="Show line numbers in code blocks"
          >
            <Toggle
              value={prefs.codeLineNumbers}
              onChange={set("codeLineNumbers")}
            />
          </Row>
          <Row
            label="Save chat history"
            desc="Store conversations in your account"
          >
            <Toggle value={prefs.saveHistory} onChange={set("saveHistory")} />
          </Row>
        </Section>

        {/* Language */}
        <Section title="Language & Region" icon={Globe}>
          <Row label="Interface language">
            <select
              value={prefs.language}
              onChange={(e) => set("language")(e.target.value)}
              className="bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="te">Telugu</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="ja">日本語</option>
            </select>
          </Row>
        </Section>

        {/* Shortcuts */}
        <Section title="Keyboard Shortcuts" icon={Keyboard}>
          {[
            { action: "New chat", keys: ["⌘", "N"] },
            { action: "Send message", keys: ["Enter"] },
            { action: "New line", keys: ["⇧", "Enter"] },
            { action: "Toggle sidebar", keys: ["⌘", "B"] },
            { action: "Search chats", keys: ["⌘", "K"] },
          ].map(({ action, keys }) => (
            <Row key={action} label={action}>
              <div className="flex items-center gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono px-2 py-0.5 rounded-lg"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </Row>
          ))}
        </Section>

        {/* Data */}
        <Section title="Data & Privacy" icon={Download}>
          <LinkRow
            label="Export all chats"
            desc="Download your chat history as JSON"
          />
          <LinkRow
            label="Privacy settings"
            desc="Control what data we collect"
          />
          <LinkRow label="Terms of Service" />
          <LinkRow label="Privacy Policy" />
        </Section>

        {/* Danger */}
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <h3 className="font-semibold text-sm text-red-700 mb-3">
            Data Management
          </h3>
          <div className="space-y-2">
            <button className="w-full flex items-center gap-2 py-2.5 px-3 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition-all">
              <Trash2 size={14} /> Clear all chat history
            </button>
            <button className="w-full flex items-center gap-2 py-2.5 px-3 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-all">
              <Trash2 size={14} /> Delete account and all data
            </button>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-slate-400 pb-2">
          Seethru v2.1.0 · Built with ❤️
        </p>
      </div>
    </div>
  );
}
