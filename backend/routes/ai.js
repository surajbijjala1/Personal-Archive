const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const { chat: aiChat } = require("../ai-provider");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const FREE_LIMIT = parseInt(process.env.FREE_MESSAGE_LIMIT) || 10;
const OWNER_USERNAME = process.env.OWNER_USERNAME || "";

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};

router.post("/chat", auth, async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const username = req.user.username;
  const isOwner = username === OWNER_USERNAME;

  // Fetch user record (chat_count, user_api_key)
  const { data: userRecord } = await supabase
    .from("users")
    .select("chat_count, user_api_key")
    .eq("username", username)
    .single();

  const chatCount = userRecord?.chat_count || 0;
  const userApiKey = userRecord?.user_api_key || null;

  // ── Determine which API key to use ──────────────────────────────────────
  let resolvedApiKey;

  if (isOwner) {
    // Owner always uses their personal key (or Ollama if AI_PROVIDER=ollama)
    resolvedApiKey = process.env.GOOGLE_API_KEY_OWNER;
  } else if (userApiKey) {
    // User supplied their own key → unlimited
    resolvedApiKey = userApiKey;
  } else if (chatCount < FREE_LIMIT) {
    // Under free trial limit → use shared trial key
    resolvedApiKey = process.env.GOOGLE_API_KEY_TRIAL;
  } else {
    // Free trial exhausted, no personal key
    return res.status(402).json({
      error: "free_limit_reached",
      chatCount,
      freeLimit: FREE_LIMIT,
    });
  }

  // ── Build journal context from user's entries ────────────────────────────
  const { data: entries } = await supabase
    .from("entries")
    .select("text, activity, mood, mood_label, created_at")
    .eq("username", username)
    .order("created_at", { ascending: false })
    .limit(30);

  const journalContext =
    entries && entries.length > 0
      ? entries
          .map((e) => {
            const act = e.activity ? ` | Context: ${e.activity}` : "";
            const mood = e.mood ? ` | Mood: ${e.mood_label} (${e.mood}/10)` : "";
            return `[${new Date(e.created_at).toLocaleString()}${act}${mood}]\n${e.text}`;
          })
          .join("\n\n")
      : "No entries yet.";

  // ── Call AI ──────────────────────────────────────────────────────────────
  try {
    const reply = await aiChat(messages, journalContext, resolvedApiKey);

    // Increment chat count for non-owner users using the trial key
    if (!isOwner && !userApiKey) {
      await supabase
        .from("users")
        .update({ chat_count: chatCount + 1 })
        .eq("username", username);
    }

    const newCount = isOwner || userApiKey ? chatCount : chatCount + 1;
    return res.json({
      reply,
      chatCount: newCount,
      freeLimit: FREE_LIMIT,
      isOwner,
      hasApiKey: !!userApiKey,
    });
  } catch (e) {
    console.error("AI chat error:", e.message);
    return res.status(500).json({ error: "AI request failed. Please try again." });
  }
});

module.exports = router;
