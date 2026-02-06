const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("ROOT OK");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

app.get("/api/admin/transactions", (req, res) => {
  res.json([{ msg: "ADMIN API WORKING" }]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 TEST SERVER RUNNING 🔥");
});
