const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("ROOT OK");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

// ✅ ADMIN TRANSACTIONS API (TEST + FINAL)
app.get("/api/admin/transactions", (req, res) => {
  res.json([]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("SERVER STARTED ON PORT " + PORT);
});
