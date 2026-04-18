import { useState } from "react";
import { getChatSessions, getChatMessages } from "../api.js";
import MdText from "./MdText.jsx";

export default function ChatHistoryDrawer({ currentSessionId, onClose }) {
  const [sessions, setSessions] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Load sessions on first open
  useState(() => {
    const load = async () => {
      setLoadingSessions(true);
      try {
        const data = await getChatSessions();
        setSessions(data);
      } catch {
        setSessions([]);
      }
      setLoadingSessions(false);
    };
    load();
  }, []);

  const openSession = async (session) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    try {
      const msgs = await getChatMessages(session.id);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
    setLoadingMessages(false);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
      " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content chat-history-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480, width: "95vw", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div className="modal-title" style={{ margin: 0 }}>
              {selectedSession ? "← Past Session" : "💬 Chat History"}
            </div>
            {selectedSession && (
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: 2 }}>
                {formatDate(selectedSession.created_at)} · Read-only
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {selectedSession && (
              <button
                onClick={() => setSelectedSession(null)}
                style={{
                  background: "var(--bg-tertiary)", border: "none", borderRadius: "var(--radius-md)",
                  padding: "6px 12px", cursor: "pointer", fontSize: "12.5px", fontFamily: "inherit",
                  color: "var(--text-secondary)",
                }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", fontSize: "18px",
                cursor: "pointer", color: "var(--text-tertiary)", padding: "0 4px",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {!selectedSession ? (
            // Session list
            loadingSessions ? (
              <div className="loading-pulse" style={{ fontSize: "13px", color: "var(--text-muted)", padding: 16, textAlign: "center" }}>
                Loading sessions...
              </div>
            ) : sessions && sessions.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px", padding: 24 }}>
                No past chat sessions yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(sessions || []).map((s) => {
                  const isCurrent = s.id === currentSessionId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => !isCurrent && openSession(s)}
                      style={{
                        textAlign: "left", padding: "12px 14px",
                        background: isCurrent ? "var(--bg-secondary)" : "var(--bg-tertiary)",
                        border: isCurrent ? "1.5px solid var(--border-medium)" : "1.5px solid transparent",
                        borderRadius: "var(--radius-md)", cursor: isCurrent ? "default" : "pointer",
                        fontFamily: "inherit", transition: "background 0.15s",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text-primary)", marginBottom: 4 }}>
                        {s.title || "Untitled session"}
                        {isCurrent && (
                          <span style={{
                            marginLeft: 8, fontSize: "11px", color: "#4a8",
                            background: "#4a820", borderRadius: "10px", padding: "2px 8px",
                          }}>
                            Current
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                        {formatDate(s.created_at)}
                        {s.message_count > 0 && ` · ${s.message_count} messages`}
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            // Message view (read-only)
            <div>
              {loadingMessages ? (
                <div className="loading-pulse" style={{ fontSize: "13px", color: "var(--text-muted)", padding: 16, textAlign: "center" }}>
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px", padding: 24 }}>
                  No messages in this session.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "85%",
                          padding: "10px 14px",
                          borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                          background: m.role === "user" ? "var(--text-primary)" : "var(--bg-secondary)",
                          color: m.role === "user" ? "white" : "var(--text-primary)",
                          fontSize: "13.5px",
                          lineHeight: 1.6,
                        }}
                      >
                        {m.role === "user" ? m.content : <MdText text={m.content} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
