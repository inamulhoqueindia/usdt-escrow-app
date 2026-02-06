const express = require("express");
const path = require("path");
const mysql = require("mysql2");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   MYSQL CONNECTION
========================= */
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection failed:", err);
  } else {
    console.log("MySQL connected");
  }
});

/* =========================
   HOME
========================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =========================
   INIT DATABASE
========================= */
app.get("/init-db", (req, res) => {

  db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone VARCHAR(20),
      role VARCHAR(20),
      wallet DECIMAL(12,2) DEFAULT 0
    )
  `);

  db.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      buyer_id INT,
      seller_id INT,
      amount DECIMAL(12,2),
      status ENUM('OPEN','APPROVED','REJECTED','COMPLETED') DEFAULT 'OPEN',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.query(`
    CREATE TABLE IF NOT EXISTS wallet_ledger (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      type ENUM('CREDIT','DEBIT'),
      amount DECIMAL(12,2),
      note VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  res.send("Database initialized");
});

/* =========================
   LOGIN
========================= */
app.post("/api/login", (req, res) => {
  const { phone, role } = req.body;

  db.query(
    "SELECT * FROM users WHERE phone=? AND role=?",
    [phone, role],
    (err, rows) => {
      if (rows.length) return res.json(rows[0]);

      db.query(
        "INSERT INTO users (phone, role) VALUES (?,?)",
        [phone, role],
        () => {
          db.query(
            "SELECT * FROM users WHERE phone=? AND role=?",
            [phone, role],
            (e, r) => res.json(r[0])
          );
        }
      );
    }
  );
});

/* =========================
   BOOKING CREATE (LOCK)
========================= */
app.post("/api/booking/create", (req, res) => {
  const { buyer_id, seller_id, amount } = req.body;

  // seller already locked?
  db.query(
    "SELECT * FROM transactions WHERE seller_id=? AND status='OPEN'",
    [seller_id],
    (err, rows) => {
      if (rows.length) {
        return res.status(400).json({ error: "Seller already booked" });
      }

      // create booking
      db.query(
        "INSERT INTO transactions (buyer_id, seller_id, amount) VALUES (?,?,?)",
        [buyer_id, seller_id, amount],
        (e, result) => {
          const txId = result.insertId;

          // 🔥 AUTO-APPROVE TIMER (3 MINUTES)
          setTimeout(() => {
            db.query(
              "UPDATE transactions SET status='COMPLETED' WHERE id=? AND status='OPEN'",
              [txId],
              () => {
                console.log("Auto-approved booking:", txId);
              }
            );
          }, 3 * 60 * 1000);

          res.json({ ok: true, tx_id: txId });
        }
      );
    }
  );
});

/* =========================
   SELLER APPROVE
========================= */
app.post("/api/booking/approve", (req, res) => {
  const { tx_id } = req.body;

  db.query(
    "UPDATE transactions SET status='APPROVED' WHERE id=? AND status='OPEN'",
    [tx_id],
    () => res.json({ ok: true })
  );
});

/* =========================
   SELLER REJECT
========================= */
app.post("/api/booking/reject", (req, res) => {
  const { tx_id } = req.body;

  db.query(
    "UPDATE transactions SET status='REJECTED' WHERE id=? AND status='OPEN'",
    [tx_id],
    () => res.json({ ok: true })
  );
});

/* =========================
   WALLET CREDIT
========================= */
app.post("/api/wallet/add", (req, res) => {
  const { user_id, amount, note } = req.body;

  db.query(
    "UPDATE users SET wallet = wallet + ? WHERE id=?",
    [amount, user_id],
    () => {
      db.query(
        "INSERT INTO wallet_ledger (user_id,type,amount,note) VALUES (?,?,?,?)",
        [user_id, "CREDIT", amount, note || "Wallet credit"],
        () => res.json({ ok: true })
      );
    }
  );
});

/* =========================
   WALLET DEBIT
========================= */
app.post("/api/wallet/deduct", (req, res) => {
  const { user_id, amount, note } = req.body;

  db.query(
    "SELECT wallet FROM users WHERE id=?",
    [user_id],
    (err, rows) => {
      if (rows[0].wallet < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      db.query(
        "UPDATE users SET wallet = wallet - ? WHERE id=?",
        [amount, user_id],
        () => {
          db.query(
            "INSERT INTO wallet_ledger (user_id,type,amount,note) VALUES (?,?,?,?)",
            [user_id, "DEBIT", amount, note || "Wallet debit"],
            () => res.json({ ok: true })
          );
        }
      );
    }
  );
});

/* =========================
   HEALTH
========================= */
app.get("/health", (req, res) => res.send("OK"));

/* =========================
   PORT
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("SERVER STARTED ON PORT " + PORT);
});
