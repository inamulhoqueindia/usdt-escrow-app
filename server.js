const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ROOT
app.get("/", (req, res) => {
  res.send("Server OK");
});

// HEALTH
app.get("/health", (req, res) => {
  res.send("OK");
});

// ADMIN TRANSACTIONS
app.get("/api/admin/transactions", (req, res) => {
  res.json([]);
});

// BOOKING CREATE (POST ONLY)
app.post("/api/booking/create", (req, res) => {
  const { buyer_id, seller_id, amount } = req.body;
  res.json({
    ok: true,
    buyer_id,
    seller_id,
    amount
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("FINAL SERVER RUNNING ON PORT " + PORT);
});
