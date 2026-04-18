require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const entryRoutes = require("./routes/entries");
const aiRoutes = require("./routes/ai");
const userRoutes = require("./routes/user");
const chatRoutes = require("./routes/chats");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/entries", entryRoutes);
app.use("/ai", aiRoutes);
app.use("/user", userRoutes);
app.use("/chats", chatRoutes);

app.listen(process.env.PORT || 3001, () =>
  console.log(`Server running on port ${process.env.PORT || 3001} | AI provider: ${process.env.AI_PROVIDER || "gemini"}`)
);