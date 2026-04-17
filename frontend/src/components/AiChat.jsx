import { useState, useRef, useEffect } from "react";
import { sendChat } from "../api.js";
import MdText from "./MdText.jsx";
import ApiKeyModal from "./ApiKeyModal.jsx";

const SUGGESTIONS = [
  "I'm feeling anxious today",
  "Summarize my recent thoughts",
  "When do I get my best insights?",
  "Show me a time I felt strong",
];

export default function AiChat({ chatCount: initialChatCount, freeLimit, hasApiKey: initialHasApiKey, isOwner }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatCount, setChatCount] = useState(initialChatCount || 0);
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey || false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    setChatCount(initialChatCount || 0);
  }, [initialChatCount]);

  useEffect(() => {
    setHasApiKey(initialHasApiKey || false);
  }, [initialHasApiKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const freeRemaining = isOwner || hasApiKey ? null : Math.max(0, freeLimit - chatCount);

  const send = async (preset) => {
    const msg = (preset || input).trim();
    if (!msg || loading) return;
    setInput("");

    const newMsgs = [...msgs, { role: "user", content: msg }];
    setMsgs(newMsgs);
    setLoading(true);

    try {
      const data = await sendChat(newMsgs);

      if (data.error === "free_limit_reached") {
        setShowKeyModal(true);
        // Remove the user message that caused this so they can retry
        setMsgs(msgs);
        setLoading(false);
        return;
      }

      setMsgs([...newMsgs, { role: "assistant", content: data.reply }]);
      if (data.chatCount !== undefined) setChatCount(data.chatCount);
      if (data.hasApiKey !== undefined) setHasApiKey(data.hasApiKey);
    } catch (e) {
      setMsgs([
        ...newMsgs,
        { role: "assistant", content: "Connection failed. Please try again." },
      ]);
    }

    setLoading(false);
  };

  const handleKeySaved = () => {
    setShowKeyModal(false);
    setHasApiKey(true);
  };

  return (
    <div
      style={{
        flex: 1,
        padding: "var(--space-lg)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 4, gap: 10 }}>
        <div className="panel-title">Your AI Companion</div>
        {/* Status badge */}
        {isOwner ? (
          <span
            style={{
              fontSize: "11.5px",
              color: "#4a4",
              background: "#4a422",
              borderRadius: "var(--radius-sm)",
              padding: "3px 9px",
              fontWeight: 500,
            }}
          >
            ✓ Owner — unlimited
          </span>
        ) : hasApiKey ? (
          <span
            style={{
              fontSize: "11.5px",
              color: "#4a4",
              background: "#4a422",
              borderRadius: "var(--radius-sm)",
              padding: "3px 9px",
              fontWeight: 500,
            }}
          >
            ✓ Your key active
          </span>
        ) : freeRemaining !== null ? (
          <span
            style={{
              fontSize: "11.5px",
              color: "var(--text-tertiary)",
              background: "var(--bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              padding: "3px 9px",
              fontWeight: 500,
            }}
          >
            {freeRemaining > 0 ? `${freeRemaining} free messages left` : "Free limit reached"}
          </span>
        ) : null}
      </div>
      <div className="panel-sub">Powered entirely by your own words</div>

      {/* Chat messages */}
      <div className="chat-box">
        {msgs.length === 0 && (
          <div className="chat-welcome">
            <div>👋 I only know what you've written. The more you share, the more I can reflect back to you.</div>
            <div style={{ marginTop: 10, fontSize: "12.5px", color: "var(--text-tertiary)" }}>
              Try asking:
            </div>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chat-suggestion" onClick={() => send(s)}>
                💬 "{s}"
              </button>
            ))}
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={`chat-bubble-row ${m.role === "user" ? "chat-bubble-row--user" : "chat-bubble-row--ai"}`}>
            <div className={m.role === "user" ? "chat-bubble--user" : "chat-bubble--ai"}>
              {m.role === "user" ? m.content : <MdText text={m.content} />}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble-row chat-bubble-row--ai">
            <div className="chat-bubble--ai">
              <span className="loading-pulse" style={{ fontSize: "12.5px", color: "var(--text-muted)", fontStyle: "italic" }}>
                Searching your archive...
              </span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input row */}
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about your thoughts..."
          disabled={loading}
        />
        <button className="chat-send-btn" onClick={() => send()} disabled={loading || !input.trim()}>
          →
        </button>
      </div>

      {/* BYOK Modal */}
      {showKeyModal && (
        <ApiKeyModal onSaved={handleKeySaved} onDismiss={() => setShowKeyModal(false)} />
      )}
    </div>
  );
}
