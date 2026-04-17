const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

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

// GET /user/me — returns chat count, key status, and owner flag
router.get("/me", auth, async (req, res) => {
  const username = req.user.username;
  const isOwner = username === OWNER_USERNAME;

  const { data: userRecord } = await supabase
    .from("users")
    .select("chat_count, user_api_key")
    .eq("username", username)
    .single();

  const chatCount = userRecord?.chat_count || 0;
  const hasApiKey = !!userRecord?.user_api_key;

  return res.json({
    username,
    isOwner,
    chatCount,
    freeLimit: FREE_LIMIT,
    hasApiKey,
    // How many free messages remain (null if owner or has own key)
    freeRemaining: isOwner || hasApiKey ? null : Math.max(0, FREE_LIMIT - chatCount),
  });
});

// POST /user/api-key — saves the user's own Gemini API key
router.post("/api-key", auth, async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || !apiKey.startsWith("AI")) {
    return res.status(400).json({ error: "Invalid API key format" });
  }

  const { error } = await supabase
    .from("users")
    .update({ user_api_key: apiKey.trim() })
    .eq("username", req.user.username);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

module.exports = router;
