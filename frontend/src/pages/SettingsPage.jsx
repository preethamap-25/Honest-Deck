import { Settings, Bell, Palette, Globe, Shield, Database, ChevronRight, Moon, Sun, Monitor, Sliders, Link } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/Appcontext";
import { useToast } from "../components/ToastProvider";
import Topbar from "../components/Topbar";

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{ height: 22, width: 40 }}
      className={`relative rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${value ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-600"}`}>
      <span style={{ width: 18, height: 18 }}
        className={`absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform duration-200 ${value ? "translate-x-[18px]" : ""}`} />
    </button>
  );
}

function Section({ title, icon: SectionIcon, children }) { // eslint-disable-line no-unused-vars
  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <SectionIcon size={15} className="text-blue-500" />
        <h3 className="font-semibold text-sm text-slate-800 dark:text-white">{title}</h3>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">{children}</div>
    </div>
  );
}

function Row({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-0.5 leading-snug">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function LinkRow({ label, desc, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <ChevronRight size={15} className="text-slate-300 dark:text-slate-500" />
    </button>
  );
}

const TRUSTED_SOURCES = ["Reuters", "Associated Press", "BBC News", "WHO", "CDC", "PolitiFact", "Snopes", "Full Fact"];

export default function SettingsPage() {
  const { theme, setTheme, prefs, updatePref,logout } = useApp();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" />
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* Fact-Check Agent */}
        <Section title="Fact-Check Agent" icon={Shield}>
          <Row label="Analysis Sensitivity" desc="Controls how strictly claims are evaluated">
            <select
              value={prefs.sensitivity}
              onChange={(e) => { updatePref("sensitivity", e.target.value); addToast(`Sensitivity set to ${e.target.value}.`, "success"); }}
              className="bg-slate-100 dark:bg-slate-700 border border-transparent rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="strict">Strict — Highest accuracy</option>
              <option value="balanced">Balanced — Recommended</option>
              <option value="lenient">Lenient — Faster results</option>
            </select>
          </Row>
          <Row label="Auto-scan URLs" desc="Automatically detect and analyse news URLs pasted in the input">
            <Toggle value={prefs.autoScanUrls} onChange={(v) => { updatePref("autoScanUrls", v); addToast(v ? "Auto URL scanning enabled." : "Auto URL scanning disabled.", "success"); }} />
          </Row>
          <Row label="Stream analysis steps" desc="Show fact-checking steps in real time">
            <Toggle value={prefs.streamResponses} onChange={(v) => updatePref("streamResponses", v)} />
          </Row>
          <Row label="Save check history" desc="Store fact-check results locally">
            <Toggle value={prefs.saveHistory} onChange={(v) => updatePref("saveHistory", v)} />
          </Row>
        </Section>

        {/* Trusted Sources */}
        <Section title="Trusted Sources" icon={Link}>
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              These sources are cross-referenced when fact-checking claims. Enable or disable based on your preferences.
            </p>
            <div className="space-y-2.5">
              {TRUSTED_SOURCES.map((src) => {
                const isEnabled = prefs.trustedSources?.includes(src);
                return (
                  <div key={src} className="flex items-center justify-between">
                    <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{src}</p>
                    <Toggle
                      value={isEnabled}
                      onChange={(v) => {
                        const updated = v
                          ? [...(prefs.trustedSources ?? []), src]
                          : (prefs.trustedSources ?? []).filter((s) => s !== src);
                        updatePref("trustedSources", updated);
                        addToast(`${src} ${v ? "added to" : "removed from"} trusted sources.`, "success");
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Appearance */}
        <Section title="Appearance" icon={Palette}>
          <Row label="Theme" desc="Choose your preferred colour scheme">
            <div className="flex gap-1.5">
              {[
                { id: "light", icon: Sun, label: "Light" },
                { id: "dark", icon: Moon, label: "Dark" },
                { id: "system", icon: Monitor, label: "System" },
              ].map(({ id, icon: Icon, label }) => ( // eslint-disable-line no-unused-vars
                <button key={id}
                  onClick={() => { setTheme(id); addToast(`Theme set to ${label}.`, "success"); }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${theme === id ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"}`}>
                  <Icon size={12} />{label}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Font Size">
            <select value={prefs.fontSize} onChange={(e) => { updatePref("fontSize", e.target.value); addToast("Font size updated.", "success"); }}
              className="bg-slate-100 dark:bg-slate-700 border border-transparent rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </Row>
          {/* <Row label="Compact Mode" desc="Reduce spacing for a denser layout">
            <Toggle value={prefs.compactMode} onChange={(v) => { updatePref("compactMode", v); addToast(v ? "Compact mode enabled." : "Compact mode disabled.", "success"); }} />
          </Row> */}
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          <Row label="Misinformation alerts" desc="Notify when a FALSE verdict is returned">
            <Toggle value={prefs.notifMessages} onChange={(v) => updatePref("notifMessages", v)} />
          </Row>
          <Row label="Breaking news alerts" desc="Get notified of high-priority news verdicts">
            <Toggle value={prefs.notifUpdates} onChange={(v) => updatePref("notifUpdates", v)} />
          </Row>
          <Row label="Weekly digest" desc="Summary of your fact-checking activity">
            <Toggle value={prefs.notifWeekly} onChange={(v) => updatePref("notifWeekly", v)} />
          </Row>
          <Row label="Sound effects">
            <Toggle value={prefs.soundEnabled} onChange={(v) => updatePref("soundEnabled", v)} />
          </Row>
        </Section>

        {/* Language */}
        {/* <Section title="Language & Region" icon={Globe}>
          <Row label="Interface language">
            <select value={prefs.language} onChange={(e) => { updatePref("language", e.target.value); addToast("Language preference saved.", "success"); }}
              className="bg-slate-100 dark:bg-slate-700 border border-transparent rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="te">Telugu</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </Row>
        </Section> */}

        {/* Advanced */}
        {/* <Section title="Advanced" icon={Sliders}>
          <LinkRow label="Export fact-check history" desc="Download all your checks as JSON" onClick={() => addToast("Export feature coming soon.", "info")} />
          <LinkRow label="API Access" desc="Integrate SeeThru into your own tools" onClick={() => addToast("API access coming soon.", "info")} />
        </Section> */}

        {/* Data */}
        <Section title="Data & Privacy" icon={Database}>
          <LinkRow label="Privacy settings" desc="Control what data we store" onClick={() => addToast("Privacy settings coming soon.", "info")} />
          <LinkRow label="Terms of Service" onClick={() => addToast("Opening Terms of Service…", "info")} />
          <LinkRow label="Privacy Policy" onClick={() => addToast("Opening Privacy Policy…", "info")} />
        </Section>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-2xl p-4">
          <div className="space-y-2">
            <button onClick={handleLogout}
              className="w-full py-2.5 px-3 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-all">
              Logout
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-2">SeeThru v1.0.0 · AI-Powered News Fact Checker</p>
      </div>
    </div>
  );
}
