const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const { scoreMood } = require("../ai-provider");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
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

// Resolve which Gemini key to use for mood scoring
function getMoodApiKey(username) {
  if (username === OWNER_USERNAME) return process.env.GOOGLE_API_KEY_OWNER;
  return process.env.GOOGLE_API_KEY_TRIAL;
}

router.get("/", auth, async (req, res) => {
  const { data } = await supabase
    .from("entries")
    .select("*")
    .eq("username", req.user.username)
    .order("created_at", { ascending: false });
  res.json(data);
});

router.post("/", auth, async (req, res) => {
  const { text, activity } = req.body;
  const username = req.user.username;

  // 1. Insert the entry first
  const { data: entry, error } = await supabase
    .from("entries")
    .insert({ username, text, activity, mood: null, mood_label: null })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // 2. Score mood in the background, then update the row
  try {
    const apiKey = getMoodApiKey(username);
    const moodData = await scoreMood(text, apiKey);
    if (moodData) {
      const { data: updated } = await supabase
        .from("entries")
        .update({ mood: moodData.score, mood_label: moodData.label })
        .eq("id", entry.id)
        .select()
        .single();
      return res.json(updated);
    }
  } catch (e) {
    console.error("Mood scoring failed:", e.message);
  }

  // 3. Return entry without mood if scoring failed
  res.json(entry);
});

router.delete("/:id", auth, async (req, res) => {
  await supabase
    .from("entries")
    .delete()
    .eq("id", req.params.id)
    .eq("username", req.user.username);
  res.json({ success: true });
});

module.exports = router;