const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const { scoreMood, moodLabel } = require("../ai-provider");

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

function getMoodApiKey(username) {
  if (username === OWNER_USERNAME) return process.env.GOOGLE_API_KEY_OWNER;
  return process.env.GOOGLE_API_KEY_TRIAL;
}

// GET /entries — return all entries for the user
router.get("/", auth, async (req, res) => {
  const { data } = await supabase
    .from("entries")
    .select("*")
    .eq("username", req.user.username)
    .order("created_at", { ascending: false });
  res.json(data);
});

// POST /entries — create entry with optional user mood score
router.post("/", auth, async (req, res) => {
  const { text, activity, mood_user } = req.body;
  const username = req.user.username;

  // Compute user mood label from lookup table (if user provided a score)
  const userScore = mood_user != null ? Math.round(Math.max(1, Math.min(10, mood_user))) : null;
  const userLabel = userScore != null ? moodLabel(userScore) : null;

  // 1. Insert the entry with the user's mood (or null if not provided)
  const { data: entry, error } = await supabase
    .from("entries")
    .insert({
      username,
      text,
      activity: activity || "🪞 Reflecting",
      mood: null,
      mood_label: null,
      mood_user: userScore,
      mood_user_label: userLabel,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // 2. Score mood from text via AI
  try {
    const apiKey = getMoodApiKey(username);
    const moodData = await scoreMood(text, apiKey);

    if (moodData) {
      // If user didn't set a mood, default mood_user to the AI score
      const finalUserScore = userScore ?? moodData.score;
      const finalUserLabel = userLabel ?? moodData.label;

      const { data: updated } = await supabase
        .from("entries")
        .update({
          mood: moodData.score,
          mood_label: moodData.label,
          mood_user: finalUserScore,
          mood_user_label: finalUserLabel,
        })
        .eq("id", entry.id)
        .select()
        .single();

      return res.json(updated);
    }
  } catch (e) {
    console.error("Mood scoring failed:", e.message);
  }

  // 3. Return entry without AI mood if scoring failed
  res.json(entry);
});

// DELETE /entries/:id
router.delete("/:id", auth, async (req, res) => {
  await supabase
    .from("entries")
    .delete()
    .eq("id", req.params.id)
    .eq("username", req.user.username);
  res.json({ success: true });
});

module.exports = router;