import { useState } from "react";

const NUMS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export default function PinPad({ mode, onSuccess, error: externalError }) {
  // mode: "setup" | "login"
  const [username, setUsername] = useState("");
  const [input, setInput] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [err, setErr] = useState("");
  const [phase, setPhase] = useState("enter"); // "enter" | "confirm" (setup only)
  const [loading, setLoading] = useState(false);

  const displayError = err || externalError || "";

  const press = (v) => {
    if (v === "") return;
    if (v === "⌫") {
      setInput((p) => p.slice(0, -1));
      setErr("");
      return;
    }
    if (input.length >= 4) return;

    const next = input + v;
    setInput(next);

    if (next.length === 4) {
      setTimeout(() => handleComplete(next), 150);
    }
  };

  const handleComplete = async (pin) => {
    if (!username.trim()) {
      setErr("Please enter a username first.");
      setInput("");
      return;
    }

    if (mode === "setup") {
      if (phase === "enter") {
        setConfirm(pin);
        setInput("");
        setPhase("confirm");
      } else {
        if (pin === confirm) {
          setLoading(true);
          try {
            await onSuccess(username.trim(), pin);
          } catch (e) {
            setErr(e.message || "Setup failed");
            setInput("");
            setPhase("enter");
            setConfirm(null);
          }
          setLoading(false);
        } else {
          setErr("PINs don't match. Try again.");
          setInput("");
          setPhase("enter");
          setConfirm(null);
        }
      }
    } else {
      // login
      setLoading(true);
      try {
        await onSuccess(username.trim(), pin);
      } catch (e) {
        setErr(e.message || "Login failed");
        setInput("");
      }
      setLoading(false);
    }
  };

  const getSubtitle = () => {
    if (mode === "setup") {
      return phase === "confirm" ? "Confirm your 4-digit PIN" : "Create a 4-digit PIN";
    }
    return "Enter your PIN to unlock";
  };

  return (
    <div className="center-screen">
      <div className="pin-wrap">
        <div className="pin-icon">🌱</div>
        <div className="pin-title">My Inner Archive</div>
        <div className="pin-subtitle">
          {mode === "setup" ? "Create your account" : "Welcome back"}
        </div>

        <input
          className="pin-username-input"
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading || (mode === "setup" && phase === "confirm")}
          autoFocus
        />

        <div className="pin-subtitle" style={{ marginBottom: 12 }}>
          {getSubtitle()}
        </div>

        <div className="pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`pin-dot ${i < input.length ? "pin-dot--filled" : "pin-dot--empty"}`}
            />
          ))}
        </div>

        {displayError && <div className="pin-error">{displayError}</div>}

        <div className="pin-numpad">
          {NUMS.map((n, i) => (
            <button
              key={i}
              className="pin-num-btn"
              style={{ visibility: n === "" ? "hidden" : "visible" }}
              onClick={() => press(n)}
              disabled={loading}
            >
              {n}
            </button>
          ))}
        </div>

        {mode === "login" && (
          <div style={{ fontSize: "12px", color: "#aaa", marginTop: 4 }}>
            Don't have an account?{" "}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "none",
                border: "none",
                color: "#1a1a1a",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "12px",
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              Create one
            </button>
          </div>
        )}

        {loading && (
          <div className="loading-pulse" style={{ fontSize: "13px", color: "#aaa", marginTop: 8 }}>
            {mode === "setup" ? "Creating account..." : "Verifying..."}
          </div>
        )}
      </div>
    </div>
  );
}
