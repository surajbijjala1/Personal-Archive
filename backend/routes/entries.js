const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: "Unauthorized" }); }
};

router.get("/", auth, async (req, res) => {
  const { data } = await supabase.from("entries")
    .select("*").eq("username", req.user.username).order("created_at", { ascending: false });
  res.json(data);
});

router.post("/", auth, async (req, res) => {
  const { text, activity, mood, mood_label } = req.body;
  const { data, error } = await supabase.from("entries")
    .insert({ username: req.user.username, text, activity, mood: mood || null, mood_label: mood_label || null }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete("/:id", auth, async (req, res) => {
  await supabase.from("entries").delete()
    .eq("id", req.params.id).eq("username", req.user.username);
  res.json({ success: true });
});

module.exports = router;