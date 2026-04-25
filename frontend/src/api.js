const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Token management ────────────────────────────────────────────────────────
export function getToken() { return localStorage.getItem("arc_token"); }
export function setToken(token) { localStorage.setItem("arc_token", token); }
export function clearToken() { localStorage.removeItem("arc_token"); }
export function hasToken() { return !!localStorage.getItem("arc_token"); }

// ─── Username memory ─────────────────────────────────────────────────────────
export function getRememberedUsername() { return localStorage.getItem("arc_username") || ""; }
export function rememberUsername(u) { localStorage.setItem("arc_username", u); }

// ─── Session memory ──────────────────────────────────────────────────────────
export function getStoredSessionId() { return localStorage.getItem("arc_session_id") || null; }
export function storeSessionId(id) { localStorage.setItem("arc_session_id", id); }
export function clearSessionId() { localStorage.removeItem("arc_session_id"); }


// ─── Authenticated fetch helper ──────────────────────────────────────────────
async function authFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  // 402 free_limit_reached — return as resolved value, not thrown
  if (res.status === 402) return res.json();

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function register(username, pin, pinLength = 4) {
  const data = await authFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, pin, pin_length: pinLength }),
  });
  setToken(data.token);
  rememberUsername(username);
  return data;
}

export async function login(username, pin) {
  const data = await authFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, pin }),
  });
  setToken(data.token);
  rememberUsername(username);
  return data;
}

export async function getPinLength(username) {
  if (!username) return 4;
  try {
    const data = await fetch(`${API_URL}/auth/pin-length?username=${encodeURIComponent(username)}`);
    const json = await data.json();
    return json.pin_length || 4;
  } catch {
    return 4;
  }
}

export async function checkUsername(username) {
  if (!username?.trim()) return { available: false };
  try {
    const res = await fetch(`${API_URL}/auth/check-username?username=${encodeURIComponent(username.trim())}`);
    return await res.json();
  } catch {
    return { available: true }; // fail-open so registration can still attempt
  }
}

export async function changePin(currentPin, newPin) {
  return authFetch("/auth/change-pin", {
    method: "POST",
    body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
  });
}

// ─── Entries ─────────────────────────────────────────────────────────────────
export async function getEntries() { return authFetch("/entries"); }

export async function createEntry(text, activity, moodUser) {
  return authFetch("/entries", {
    method: "POST",
    body: JSON.stringify({ text, activity, mood_user: moodUser ?? null }),
  });
}

export async function deleteEntry(id) {
  return authFetch(`/entries/${id}`, { method: "DELETE" });
}

export async function getEntryMood(entryId) {
  return authFetch(`/entries/${entryId}`);
}

// ─── User ─────────────────────────────────────────────────────────────────────
export async function getMe() { return authFetch("/user/me"); }

export async function saveApiKey(apiKey) {
  return authFetch("/user/api-key", {
    method: "POST",
    body: JSON.stringify({ apiKey }),
  });
}

export async function addTag(tag) {
  return authFetch("/user/tags", {
    method: "POST",
    body: JSON.stringify({ tag }),
  });
}

export async function removeTag(tag) {
  return authFetch(`/user/tags/${encodeURIComponent(tag)}`, { method: "DELETE" });
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────
export async function sendChat(messages, sessionId) {
  return authFetch("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages, session_id: sessionId }),
  });
}

// ─── Chat Sessions ────────────────────────────────────────────────────────────
export async function createChatSession() {
  return authFetch("/chats/session", { method: "POST" });
}

export async function getChatSessions() {
  return authFetch("/chats/sessions");
}

export async function getChatMessages(sessionId) {
  return authFetch(`/chats/sessions/${sessionId}/messages`);
}
