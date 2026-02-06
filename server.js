const express = require("express");
const path = require("path");

const app = express();

// JSON body support
app.use(express.json());

// public folder serve karo
app.use(express.static(path.join(__dirname, "public")));

// Home route → login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Demo login API
app.post("/login", (req, res) => {
  res.send("OTP sent (demo)");
});

// Health check (Render ke liye useful)
app.get("/health", (req, res) => {
  res.send("OK");
});

// ⚠️ VERY IMPORTANT FOR RENDER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("SERVER STARTED ON PORT " + PORT);
});
