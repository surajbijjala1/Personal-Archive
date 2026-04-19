import { useState, useEffect, useRef } from "react";
import {
  hasToken, clearToken,
  getEntries, createEntry, deleteEntry,
  register, login, getMe,
  createChatSession,
  addTag, removeTag,
  getStoredSessionId, storeSessionId, clearSessionId,
} from "./api.js";

import PinPad from "./components/PinPad.jsx";
import Header from "./components/Header.jsx";
import EntryForm from "./components/EntryForm.jsx";
import EntryList from "./components/EntryList.jsx";
import MoodGraph from "./components/MoodGraph.jsx";
import AiChat from "./components/AiChat.jsx";
import OnThisDayModal from "./components/OnThisDayModal.jsx";
import ChatHistoryDrawer from "./components/ChatHistoryDrawer.jsx";
import ProfileModal from "./components/ProfileModal.jsx";

const FEATURES = [
  ["📝", "Capture thoughts", "Write anything, any time. Timestamped and private."],
  ["🏷️", "Tag your context", "Record where you were when the insight hit."],
  ["📈", "Mood timeline", "See your emotional patterns over time, automatically."],
  ["🤖", "AI from your words", "Your archive answers with only your own words."],
  ["📅", "On This Day", "See what you wrote on this date in past years."],
];

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [entries, setEntries] = useState([]);
  const [activeTab, setActiveTab] = useState("journal");
  const [onThisDay, setOnThisDay] = useState([]);
  const [showOTD, setShowOTD] = useState(false);
  const [showChats, setShowChats] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState("");

  // User / AI / session state
  const [username, setUsername] = useState("");
  const [chatCount, setChatCount] = useState(0);
  const [freeLimit, setFreeLimit] = useState(10);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [pinLength, setPinLength] = useState(4);
  const [customTags, setCustomTags] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  // Resizable panel state
  const [panelWidth, setPanelWidth] = useState(() =>
    parseFloat(localStorage.getItem("arc_panel_width")) || 45
  );
  const isDragging = useRef(false);
  const panelWidthRef = useRef(panelWidth);
  const splitRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(70, Math.max(25, pct));
      setPanelWidth(clamped);
      panelWidthRef.current = clamped;
    };
    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        localStorage.setItem("arc_panel_width", panelWidthRef.current);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    if (hasToken()) {
      loadApp();
    } else {
      setScreen("welcome");
    }
  }, []);

  const loadApp = async () => {
    try {
      // Reuse the existing session on page reload — only create a new one on fresh login
      let sid = getStoredSessionId();

      const [data, me] = await Promise.all([getEntries(), getMe()]);

      // If no stored session exists yet, create one now (first ever load after registration)
      if (!sid) {
        const session = await createChatSession();
        sid = session.session_id;
        storeSessionId(sid);
      }

      setEntries(data || []);
      checkOnThisDay(data || []);
      setUsername(me.username);
      setChatCount(me.chatCount);
      setFreeLimit(me.freeLimit);
      setHasApiKey(me.hasApiKey);
      setIsOwner(me.isOwner);
      setPinLength(me.pinLength || 4);
      setCustomTags(me.customTags || []);
      setSessionId(sid);
      setScreen("app");
    } catch {
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

  const handleSetup = async (u, pin, pLen) => {
    setAuthError("");
    await register(u, pin, pLen);
    // Fresh login — always create a new session
    const session = await createChatSession();
    storeSessionId(session.session_id);
    await loadApp();
  };

  const handleLogin = async (u, pin) => {
    setAuthError("");
    await login(u, pin);
    // Fresh login — always create a new session
    const session = await createChatSession();
    storeSessionId(session.session_id);
    await loadApp();
  };

  const handleSaveEntry = async (text, activity, moodUser) => {
    setSaving(true);
    try {
      const entry = await createEntry(text, activity, moodUser);
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

  const handleAddTag = async (tag) => {
    const result = await addTag(tag);
    setCustomTags(result.tags);
  };

  const handleRemoveTag = async (tag) => {
    const result = await removeTag(tag);
    setCustomTags(result.tags);
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
      [`MY INNER ARCHIVE\nExported: ${new Date().toLocaleString()}\nEntries: ${entries.length}\n\n${"═".repeat(40)}\n\n${lines}`],
      { type: "text/plain" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "my-inner-archive.txt";
    a.click();
  };

  const handleLock = () => {
    clearToken();
    clearSessionId();
    setEntries([]);
    setSessionId(null);
    setScreen("login");
  };

  // ── Screens ──────────────────────────────────────────────────────────────

  if (screen === "loading") {
    return <div className="center-screen"><span className="loading-text loading-pulse">Loading...</span></div>;
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
          <button className="welcome-cta" onClick={() => setScreen("setup")}>Get Started →</button>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setScreen("login")}
              style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}
            >
              Already have an account? <strong style={{ color: "#1a1a1a" }}>Log in</strong>
            </button>
          </div>
          <div className="welcome-footer">Your thoughts are private and stored securely.</div>
        </div>
      </div>
    );
  }

  if (screen === "setup") return <PinPad mode="setup" onSuccess={handleSetup} error={authError} />;
  if (screen === "login") return <PinPad mode="login" onSuccess={handleLogin} error={authError} />;

  // ── Main App ──────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      <Header
        onThisDayCount={onThisDay.length}
        onShowOTD={() => setShowOTD(true)}
        onExport={handleExport}
        onLock={handleLock}
        onShowChats={() => setShowChats(true)}
        onShowProfile={() => setShowProfile(true)}
      />

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

      <div
        className="split-layout"
        ref={splitRef}
        style={{ display: "flex", overflow: "hidden" }}
      >
        <div className="panel-left" style={{ flex: `0 0 ${panelWidth}%`, width: `${panelWidth}%` }}>
          {activeTab === "journal" && (
            <>
              <EntryForm
                onSave={handleSaveEntry}
                saving={saving}
                customTags={customTags}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
              />
              <hr className="divider" />
              <EntryList entries={entries} onDelete={handleDeleteEntry} />
            </>
          )}
          {activeTab === "mood" && <MoodGraph entries={entries} />}
        </div>

        {/* Draggable resizer handle */}
        <div
          className="panel-resizer"
          onMouseDown={(e) => {
            e.preventDefault();
            isDragging.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        />

        <AiChat
          sessionId={sessionId}
          chatCount={chatCount}
          freeLimit={freeLimit}
          hasApiKey={hasApiKey}
          isOwner={isOwner}
        />
      </div>

      {showOTD && <OnThisDayModal entries={onThisDay} onClose={() => setShowOTD(false)} />}
      {showChats && <ChatHistoryDrawer currentSessionId={sessionId} onClose={() => setShowChats(false)} />}
      {showProfile && (
        <ProfileModal
          username={username}
          pinLength={pinLength}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}