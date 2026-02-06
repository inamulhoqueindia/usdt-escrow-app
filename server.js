const express = require("express");
const path = require("path");
const app = express();

// public folder ko serve karo
app.use(express.static(path.join(__dirname, "public")));

// root route pe login page dikhao
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// demo login API
app.post("/login", (req, res) => {
  res.send("OTP sent (demo)");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log("SERVER STARTED ON PORT " + PORT);
});
