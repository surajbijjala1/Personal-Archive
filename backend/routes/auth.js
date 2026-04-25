const router = require("express").Router();
const bcrypt = require("bcryptjs");
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

// POST /auth/register — create account with username, pin, and pin_length
router.post("/register", async (req, res) => {
  const { username, pin, pin_length } = req.body;
  const pinLen = pin_length === 6 ? 6 : 4;

  if (!username?.trim()) return res.status(400).json({ error: "Username is required" });
  if (!pin || pin.length !== pinLen) {
    return res.status(400).json({ error: `PIN must be ${pinLen} digits` });
  }

  const hash = await bcrypt.hash(pin, 10);
  const { error } = await supabase
    .from("users")
    .insert({ username: username.trim(), pin_hash: hash, pin_length: pinLen });

  if (error) {
    // Supabase may surface PG error code in error.code OR only in error.message
    if (
      error.code === "23505" ||
      error.message?.includes("duplicate key") ||
      error.message?.includes("unique constraint")
    ) {
      return res.status(409).json({ error: "Username already exists. Try a different name." });
    }
    return res.status(400).json({ error: error.message });
  }
  const token = jwt.sign({ username: username.trim() }, process.env.JWT_SECRET, { expiresIn: "30d" });
  res.json({ token });
});

// GET /auth/check-username?username=x — check if a username is available (unauthenticated)
router.get("/check-username", async (req, res) => {
  const { username } = req.query;
  if (!username?.trim()) return res.json({ available: false });

  const { data } = await supabase
    .from("users")
    .select("username")
    .eq("username", username.trim())
    .single();

  res.json({ available: !data });
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { username, pin } = req.body;
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (!data) return res.status(404).json({ error: "User not found" });
  const valid = await bcrypt.compare(pin, data.pin_hash);
  if (!valid) return res.status(401).json({ error: "Wrong PIN" });

  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, pin_length: data.pin_length || 4 });
});

// GET /auth/pin-length?username=x — unauthenticated, used by login screen to size dots
router.get("/pin-length", async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: "username required" });

  const { data } = await supabase
    .from("users")
    .select("pin_length")
    .eq("username", username)
    .single();

  res.json({ pin_length: data?.pin_length || 4 });
});

// POST /auth/change-pin — JWT protected, verify current PIN then set new
router.post("/change-pin", auth, async (req, res) => {
  const { current_pin, new_pin } = req.body;
  const username = req.user.username;

  const { data } = await supabase
    .from("users")
    .select("pin_hash, pin_length")
    .eq("username", username)
    .single();

  if (!data) return res.status(404).json({ error: "User not found" });

  const valid = await bcrypt.compare(current_pin, data.pin_hash);
  if (!valid) return res.status(401).json({ error: "Current PIN is incorrect" });

  if (!new_pin || (new_pin.length !== 4 && new_pin.length !== 6)) {
    return res.status(400).json({ error: "New PIN must be 4 or 6 digits" });
  }

  const newHash = await bcrypt.hash(new_pin, 10);
  const { error } = await supabase
    .from("users")
    .update({ pin_hash: newHash, pin_length: new_pin.length })
    .eq("username", username);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;