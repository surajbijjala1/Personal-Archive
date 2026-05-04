const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// POST /chats/session — create a new chat session
router.post("/session", auth, async (req, res) => {
  const username = req.user.username;
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ username, title: null })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ session_id: data.id, created_at: data.created_at });
});

// GET /chats/sessions — list only non-empty sessions for the user
router.get("/sessions", auth, async (req, res) => {
  const username = req.user.username;

  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select("id, title, created_at")
    .eq("username", username)
    .order("created_at", { ascending: false });

  if (!sessions) return res.json([]);

  // Attach message count and filter out empty sessions
  const enriched = await Promise.all(
    sessions.map(async (s) => {
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("session_id", s.id);
      return { ...s, message_count: count || 0 };
    })
  );

  // Only return sessions that have at least 1 message
  res.json(enriched.filter((s) => s.message_count > 0));
});

// GET /chats/sessions/:id/messages — get all messages for a session
router.get("/sessions/:id/messages", auth, async (req, res) => {
  const username = req.user.username;
  const sessionId = req.params.id;

  // Verify this session belongs to the user
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("username")
    .eq("id", sessionId)
    .single();

  if (!session || session.username !== username) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  res.json(messages || []);
});

// POST /chats/sessions/:id/messages — save a message to a session
router.post("/sessions/:id/messages", auth, async (req, res) => {
  const { role, content } = req.body;
  const sessionId = req.params.id;
  const username = req.user.username;

  if (!role || !content) return res.status(400).json({ error: "role and content required" });

  // Verify ownership
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("username, title")
    .eq("id", sessionId)
    .single();

  if (!session || session.username !== username) {
    return res.status(403).json({ error: "Not authorized" });
  }

  // Auto-set title from first user message
  if (!session.title && role === "user") {
    const title = content.length > 50 ? content.slice(0, 47) + "..." : content;
    await supabase.from("chat_sessions").update({ title }).eq("id", sessionId);
  }

  const { error } = await supabase
    .from("chat_messages")
    .insert({ session_id: sessionId, role, content });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// DELETE /chats/sessions/:id — delete a session and all its messages
router.delete("/sessions/:id", auth, async (req, res) => {
  const sessionId = req.params.id;
  const username = req.user.username;

  // Verify ownership
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("username")
    .eq("id", sessionId)
    .single();

  if (!session || session.username !== username) {
    return res.status(403).json({ error: "Not authorized" });
  }

  // Delete messages first (FK constraint), then session
  const { error: msgErr } = await supabase.from("chat_messages").delete().eq("session_id", sessionId);
  if (msgErr) {
    console.error("[ERROR] Delete chat messages:", msgErr.message);
    return res.status(500).json({ error: msgErr.message });
  }

  const { error: sessErr } = await supabase.from("chat_sessions").delete().eq("id", sessionId);
  if (sessErr) {
    console.error("[ERROR] Delete chat session:", sessErr.message);
    return res.status(500).json({ error: sessErr.message });
  }

  res.json({ success: true });
});

module.exports = router;
