const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Token management ────────────────────────────────────────────────────────
export function getToken() { return localStorage.getItem("arc_token"); }
export function setToken(token) { localStorage.setItem("arc_token", token); }
export function clearToken() { localStorage.removeItem("arc_token"); }
export function hasToken() { return !!localStorage.getItem("arc_token"); }

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

  // For 402 (free limit reached), return the body as a resolved value
  // so callers can inspect the error type without crashing
  if (res.status === 402) {
    return res.json();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function register(username, pin) {
  const data = await authFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, pin }),
  });
  setToken(data.token);
  return data;
}

export async function login(username, pin) {
  const data = await authFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, pin }),
  });
  setToken(data.token);
  return data;
}

// ─── Entries ─────────────────────────────────────────────────────────────────
export async function getEntries() {
  return authFetch("/entries");
}

export async function createEntry(text, activity) {
  return authFetch("/entries", {
    method: "POST",
    body: JSON.stringify({ text, activity }),
  });
}

export async function deleteEntry(id) {
  return authFetch(`/entries/${id}`, { method: "DELETE" });
}

// ─── User ─────────────────────────────────────────────────────────────────────
export async function getMe() {
  return authFetch("/user/me");
}

export async function saveApiKey(apiKey) {
  return authFetch("/user/api-key", {
    method: "POST",
    body: JSON.stringify({ apiKey }),
  });
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────
export async function sendChat(messages) {
  return authFetch("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
}
