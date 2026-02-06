const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔹 MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect(err => {
  if (err) {
    console.error("MySQL error:", err);
  } else {
    console.log("MySQL connected");
  }
});

// 🔹 Health
app.get("/health", (req, res) => {
  res.send("OK");
});

// 🔹 Create booking (BUYER)
app.post("/api/booking/create", (req, res) => {
  const { buyer_id, seller_id, amount } = req.body;

  if (!buyer_id || !seller_id || !amount) {
    return res.json({ ok: false, msg: "Missing fields" });
  }

  const sql = `
    INSERT INTO transactions (buyer_id, seller_id, amount, status)
    VALUES (?, ?, ?, 'OPEN')
  `;

  db.query(sql, [buyer_id, seller_id, amount], (err) => {
    if (err) {
      console.error(err);
      return res.json({ ok: false });
    }
    res.json({ ok: true });
  });
});

// 🔹 Admin: list transactions
app.get("/api/admin/transactions", (req, res) => {
  db.query("SELECT * FROM transactions ORDER BY id DESC", (err, rows) => {
    if (err) {
      console.error(err);
      return res.json([]);
    }
    res.json(rows);
  });
});

// 🔹 Admin release (Buyer / Seller)
app.post("/api/admin/release", (req, res) => {
  const { tx_id, release_to } = req.body;

  db.query(
    "UPDATE transactions SET status='COMPLETED', released_to=? WHERE id=?",
    [release_to, tx_id],
    () => {
      res.json({ ok: true });
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("SERVER RUNNING ON PORT " + PORT);
});


app.get("/api/seller/pending", (req, res) => {
  db.query(
    "SELECT * FROM transactions WHERE status='OPEN'",
    (err, rows) => res.json(rows || [])
  );
});

app.post("/api/seller/approve", (req, res) => {
  const { id } = req.body;
  db.query(
    "UPDATE transactions SET status='APPROVED', released_to='SELLER' WHERE id=?",
    [id],
    () => res.json({ ok: true })
  );
});

app.post("/api/seller/reject", (req, res) => {
  const { id } = req.body;
  db.query(
    "UPDATE transactions SET status='DISPUTE' WHERE id=?",
    [id],
    () => res.json({ ok: true })
  );
});
