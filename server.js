

app.get("/render-proof", (req, res) => {
  res.send("RENDER IS RUNNING LATEST CODE");
});

const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const multer = require("multer");

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

/* ======================
   MYSQL CONNECTION
====================== */
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

/* ======================
   FILE UPLOAD
====================== */
const upload = multer({ dest: "uploads/" });

/* ======================
   HEALTH
====================== */
app.get("/health", (req, res) => {
  res.send("OK");
});

/* ======================
   BUYER CREATE BOOKING
====================== */
app.post("/api/booking/create", (req, res) => {
  const { buyer_id, seller_id, amount } = req.body;

  if (!buyer_id || !seller_id || !amount) {
    return res.json({ ok: false });
  }

  db.query(
    "INSERT INTO transactions (buyer_id, seller_id, amount, status) VALUES (?, ?, ?, 'OPEN')",
    [buyer_id, seller_id, amount],
    err => {
      if (err) {
        console.error(err);
        return res.json({ ok: false });
      }
      res.json({ ok: true });
    }
  );
});

/* ======================
   BUYER OPEN BOOKINGS  ✅ THIS WAS MISSING
====================== */
app.get("/api/buyer/open", (req, res) => {
  db.query(
    "SELECT * FROM transactions WHERE status='OPEN'",
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.json([]);
      }
      res.json(rows);
    }
  );
});

/* ======================
   BUYER PAYMENT SUBMIT
====================== */
app.post("/api/buyer/pay", upload.single("proof"), (req, res) => {
  const { id, utr } = req.body;
  const proof = req.file ? req.file.filename : null;

  if (!id || !utr || !proof) {
    return res.json({ ok: false });
  }

  db.query(
    "UPDATE transactions SET status='PAID', released_to=? WHERE id=?",
    [utr, id],
    () => res.json({ ok: true })
  );
});

/* ======================
   ADMIN TRANSACTIONS
====================== */
app.get("/api/admin/transactions", (req, res) => {
  db.query(
    "SELECT * FROM transactions ORDER BY id DESC",
    (err, rows) => res.json(rows || [])
  );
});

/* ======================
   SERVER
====================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("SERVER RUNNING ON PORT " + PORT);
});
