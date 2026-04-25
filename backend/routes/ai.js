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
  const { messages, session_id } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const username = req.user.username;
  const isOwner = username === OWNER_USERNAME;

  // Fetch user record
  const { data: userRecord } = await supabase
    .from("users")
    .select("chat_count, user_api_key")
    .eq("username", username)
    .single();

  const chatCount = userRecord?.chat_count || 0;
  const userApiKey = userRecord?.user_api_key || null;

  // Determine which API key to use
  let resolvedApiKey;
  if (isOwner) {
    resolvedApiKey = process.env.GOOGLE_API_KEY_OWNER;
  } else if (userApiKey) {
    resolvedApiKey = userApiKey;
  } else if (chatCount < FREE_LIMIT) {
    resolvedApiKey = process.env.GOOGLE_API_KEY_TRIAL;
  } else {
    return res.status(402).json({ error: "free_limit_reached", chatCount, freeLimit: FREE_LIMIT });
  }

  // Build journal context
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

  // Call AI
  try {
    const lastUserMsg = messages[messages.length - 1].content;

    const start = performance.now();
    const reply = await aiChat(messages, journalContext, resolvedApiKey);
    const elapsed = (performance.now() - start).toFixed(0);
    console.log(`[METRIC] Chat | user=${username} | session=${session_id || "none"} | provider=${process.env.AI_PROVIDER || "gemini"} | latency=${elapsed}ms | msgLen=${reply.length}`);

    // Persist messages to chat session
    if (session_id) {
      const { data: sessionData } = await supabase
        .from("chat_sessions")
        .select("title")
        .eq("id", session_id)
        .single();

      if (sessionData && !sessionData.title) {
        const title = lastUserMsg.length > 50 ? lastUserMsg.slice(0, 47) + "..." : lastUserMsg;
        await supabase.from("chat_sessions").update({ title }).eq("id", session_id);
      }

      await supabase.from("chat_messages").insert([
        { session_id, role: "user", content: lastUserMsg },
        { session_id, role: "assistant", content: reply },
      ]);
    }

    // Increment chat count for trial users
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
    console.error(`[ERROR] Chat | user=${username} |`, e.message);
    return res.status(500).json({ error: "AI request failed. Please try again." });
  }
});

module.exports = router;
