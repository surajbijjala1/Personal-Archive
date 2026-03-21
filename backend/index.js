require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const entryRoutes = require("./routes/entries");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/entries", entryRoutes);
app.listen(process.env.PORT || 3001, () => console.log("Server running"));