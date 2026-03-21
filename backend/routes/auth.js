const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Register (first-time PIN setup)
router.post("/register", async (req, res) => {
  const { username, pin } = req.body;
  const hash = await bcrypt.hash(pin, 10);
  const { error } = await supabase.from("users").insert({ username, pin_hash: hash });
  if (error) return res.status(400).json({ error: error.message });
  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "30d" });
  res.json({ token });
});

// Login
router.post("/login", async (req, res) => {
  const { username, pin } = req.body;
  const { data } = await supabase.from("users").select("*").eq("username", username).single();
  if (!data) return res.status(404).json({ error: "User not found" });
  const valid = await bcrypt.compare(pin, data.pin_hash);
  if (!valid) return res.status(401).json({ error: "Wrong PIN" });
  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "30d" });
  res.json({ token });
});

module.exports = router;