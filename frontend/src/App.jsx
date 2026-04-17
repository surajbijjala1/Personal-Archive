import { useState, useEffect } from "react";
import { hasToken, clearToken, getEntries, createEntry, deleteEntry, register, login } from "./api.js";

import PinPad from "./components/PinPad.jsx";
import Header from "./components/Header.jsx";
import EntryForm from "./components/EntryForm.jsx";
import EntryList from "./components/EntryList.jsx";
import MoodGraph from "./components/MoodGraph.jsx";
import AiChat from "./components/AiChat.jsx";
import OnThisDayModal from "./components/OnThisDayModal.jsx";

const FEATURES = [
  ["📝", "Capture thoughts", "Write anything, any time. Timestamped and private."],
  ["🏷️", "Tag your context", "Record where you were when the insight hit."],
  ["📈", "Mood timeline", "See your emotional patterns over time, automatically."],
  ["🤖", "AI from your words", "Your archive answers with only your own words."],
  ["📅", "On This Day", "See what you wrote on this date in past years."],
];

export default function App() {
  const [screen, setScreen] = useState("loading"); // loading | welcome | setup | login | app
  const [entries, setEntries] = useState([]);
  const [activeTab, setActiveTab] = useState("journal"); // journal | mood
  const [onThisDay, setOnThisDay] = useState([]);
  const [showOTD, setShowOTD] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState("");

  // On mount, check if we have a valid token
  useEffect(() => {
    if (hasToken()) {
      loadEntries();
    } else {
      setScreen("welcome");
    }
  }, []);

  const loadEntries = async () => {
    try {
      const data = await getEntries();
      setEntries(data || []);
      checkOnThisDay(data || []);
      setScreen("app");
    } catch {
      // Token is invalid or expired
      clearToken();
      setScreen("login");
    }
  };

  const checkOnThisDay = (all) => {
    const now = new Date();
    setOnThisDay(
      all.filter((e) => {
        const d = new Date(e.created_at);
        return (
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate() &&
          d.getFullYear() < now.getFullYear()
        );
      })
    );
  };

  // Auth handlers
  const handleSetup = async (username, pin) => {
    setAuthError("");
    await register(username, pin);
    await loadEntries();
  };

  const handleLogin = async (username, pin) => {
    setAuthError("");
    await login(username, pin);
    await loadEntries();
  };

  // Entry handlers
  const handleSaveEntry = async (text, activity) => {
    setSaving(true);
    try {
      const entry = await createEntry(text, activity);
      const updated = [entry, ...entries];
      setEntries(updated);
      checkOnThisDay(updated);
    } catch (e) {
      alert("Failed to save: " + e.message);
    }
    setSaving(false);
  };

  const handleDeleteEntry = async (id) => {
    try {
      await deleteEntry(id);
      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      checkOnThisDay(updated);
    } catch (e) {
      alert("Failed to delete: " + e.message);
    }
  };

  const handleExport = () => {
    const lines = entries
      .map((e) => {
        const act = e.activity ? `\nContext: ${e.activity}` : "";
        const mood = e.mood ? `\nMood: ${e.mood_label} (${e.mood}/10)` : "";
        return `[${new Date(e.created_at).toLocaleString()}]${act}${mood}\n${e.text}`;
      })
      .join("\n\n---\n\n");
    const blob = new Blob(
      [
        `MY INNER ARCHIVE\nExported: ${new Date().toLocaleString()}\nEntries: ${entries.length}\n\n${"═".repeat(40)}\n\n${lines}`,
      ],
      { type: "text/plain" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "my-inner-archive.txt";
    a.click();
  };

  const handleLock = () => {
    clearToken();
    setEntries([]);
    setScreen("login");
  };

  // --- SCREENS ---

  if (screen === "loading") {
    return (
      <div className="center-screen">
        <span className="loading-text loading-pulse">Loading...</span>
      </div>
    );
  }

  if (screen === "welcome") {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <div className="welcome-icon">🌱</div>
          <div className="welcome-title">My Inner Archive</div>
          <div className="welcome-desc">
            A private space to capture your thoughts and let AI reflect your own wisdom back to you.
          </div>

          <div className="welcome-features">
            {FEATURES.map(([icon, title, desc]) => (
              <div key={title} className="welcome-feature">
                <div className="welcome-feature-icon">{icon}</div>
                <div>
                  <div className="welcome-feature-title">{title}</div>
                  <div className="welcome-feature-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <button className="welcome-cta" onClick={() => setScreen("setup")}>
            Get Started →
          </button>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setScreen("login")}
              style={{
                background: "none",
                border: "none",
                color: "#888",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "inherit",
              }}
            >
              Already have an account? <strong style={{ color: "#1a1a1a" }}>Log in</strong>
            </button>
          </div>
          <div className="welcome-footer">Your thoughts are private and stored securely.</div>
        </div>
      </div>
    );
  }

  if (screen === "setup") {
    return <PinPad mode="setup" onSuccess={handleSetup} error={authError} />;
  }

  if (screen === "login") {
    return <PinPad mode="login" onSuccess={handleLogin} error={authError} />;
  }

  // --- MAIN APP ---
  return (
    <div className="app-shell">
      <Header
        onThisDayCount={onThisDay.length}
        onShowOTD={() => setShowOTD(true)}
        onExport={handleExport}
        onLock={handleLock}
      />

      {/* Tabs */}
      <div className="tabs">
        {["journal", "mood"].map((t) => (
          <button
            key={t}
            className={`tab ${activeTab === t ? "tab--active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {t === "journal" ? "📝 Journal" : "📈 Mood Timeline"}
          </button>
        ))}
      </div>

      <div className="split-layout">
        {/* Left panel */}
        <div className="panel-left">
          {activeTab === "journal" && (
            <>
              <EntryForm onSave={handleSaveEntry} saving={saving} />
              <hr className="divider" />
              <EntryList entries={entries} onDelete={handleDeleteEntry} />
            </>
          )}
          {activeTab === "mood" && <MoodGraph entries={entries} />}
        </div>

        {/* Right panel */}
        <AiChat />
      </div>

      {/* On This Day Modal */}
      {showOTD && <OnThisDayModal entries={onThisDay} onClose={() => setShowOTD(false)} />}
    </div>
  );
}