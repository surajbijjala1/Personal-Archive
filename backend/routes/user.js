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

// GET /user/me — full user profile
router.get("/me", auth, async (req, res) => {
  const username = req.user.username;
  const isOwner = username === OWNER_USERNAME;

  const { data: userRecord } = await supabase
    .from("users")
    .select("chat_count, user_api_key, pin_length, custom_tags")
    .eq("username", username)
    .single();

  const chatCount = userRecord?.chat_count || 0;
  const hasApiKey = !!userRecord?.user_api_key;
  const pinLength = userRecord?.pin_length || 4;
  const customTags = userRecord?.custom_tags || [];

  return res.json({
    username,
    isOwner,
    chatCount,
    freeLimit: FREE_LIMIT,
    hasApiKey,
    pinLength,
    customTags,
    freeRemaining: isOwner || hasApiKey ? null : Math.max(0, FREE_LIMIT - chatCount),
  });
});

// POST /user/api-key — save own Gemini API key
router.post("/api-key", auth, async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: "API key is required" });

  const { error } = await supabase
    .from("users")
    .update({ user_api_key: apiKey.trim() })
    .eq("username", req.user.username);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

// GET /user/tags — get custom tags
router.get("/tags", auth, async (req, res) => {
  const { data } = await supabase
    .from("users")
    .select("custom_tags")
    .eq("username", req.user.username)
    .single();

  res.json({ tags: data?.custom_tags || [] });
});

// POST /user/tags — add a custom tag
router.post("/tags", auth, async (req, res) => {
  const { tag } = req.body;
  if (!tag?.trim()) return res.status(400).json({ error: "Tag is required" });
  if (tag.trim().length > 30) return res.status(400).json({ error: "Tag must be 30 chars or less" });

  const { data } = await supabase
    .from("users")
    .select("custom_tags")
    .eq("username", req.user.username)
    .single();

  const existing = data?.custom_tags || [];
  if (existing.length >= 20) return res.status(400).json({ error: "Maximum 20 custom tags" });
  if (existing.includes(tag.trim())) return res.status(400).json({ error: "Tag already exists" });

  const updated = [...existing, tag.trim()];
  await supabase.from("users").update({ custom_tags: updated }).eq("username", req.user.username);
  res.json({ tags: updated });
});

// DELETE /user/tags/:tag — remove a custom tag
router.delete("/tags/:tag", auth, async (req, res) => {
  const tagToRemove = decodeURIComponent(req.params.tag);

  const { data } = await supabase
    .from("users")
    .select("custom_tags")
    .eq("username", req.user.username)
    .single();

  const updated = (data?.custom_tags || []).filter((t) => t !== tagToRemove);
  await supabase.from("users").update({ custom_tags: updated }).eq("username", req.user.username);
  res.json({ tags: updated });
});

module.exports = router;
