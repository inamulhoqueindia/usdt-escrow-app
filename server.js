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

db.connect(err => {
  if (err) console.error("MySQL error:", err);
  else console.log("MySQL connected");
});

/* =========================
   HOME
========================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =========================
   INIT DB
========================= */
app.get("/init-db", (req, res) => {

  db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone VARCHAR(20),
      role ENUM('BUYER','SELLER','ADMIN'),
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
    (e, rows) => {
      if (rows.length) return res.json(rows[0]);

      db.query(
        "INSERT INTO users (phone, role) VALUES (?,?)",
        [phone, role],
        () => {
          db.query(
            "SELECT * FROM users WHERE phone=? AND role=?",
            [phone, role],
            (x, r) => res.json(r[0])
          );
        }
      );
    }
  );
});

/* =========================
   BOOKING CREATE (SECURED)
========================= */
app.post("/api/booking/create", (req, res) => {
  const { buyer_id, seller_id, amount } = req.body;

  // Rule: min & max amount
  if (amount < 100 || amount > 100000) {
    return res.status(400).json({ error: "Invalid amount range" });
  }

  // Rule: seller cannot book self
  if (buyer_id === seller_id) {
    return res.status(400).json({ error: "Self booking blocked" });
  }

  // Rule: seller already locked?
  db.query(
    "SELECT * FROM transactions WHERE seller_id=? AND status='OPEN'",
    [seller_id],
    (e, rows) => {
      if (rows.length) {
        return res.status(400).json({ error: "Seller already booked" });
      }

      // Rule: duplicate booking spam (same buyer-seller-amount)
      db.query(
        "SELECT * FROM transactions WHERE buyer_id=? AND seller_id=? AND amount=? AND created_at > NOW() - INTERVAL 5 MINUTE",
        [buyer_id, seller_id, amount],
        (x, dup) => {
          if (dup.length) {
            return res.status(400).json({ error: "Duplicate booking blocked" });
          }

          db.query(
            "INSERT INTO transactions (buyer_id, seller_id, amount) VALUES (?,?,?)",
            [buyer_id, seller_id, amount],
            (err, result) => {

              const txId = result.insertId;

              // Server-side auto complete
              setTimeout(() => {
                db.query(
                  "UPDATE transactions SET status='COMPLETED' WHERE id=? AND status='OPEN'",
                  [txId]
                );
              }, 3 * 60 * 1000);

              res.json({ ok: true, tx_id: txId });
            }
          );
        }
      );
    }
  );
});

/* =========================
   SELLER ACTION
========================= */
app.post("/api/booking/approve", (req, res) => {
  db.query(
    "UPDATE transactions SET status='APPROVED' WHERE id=? AND status='OPEN'",
    [req.body.tx_id],
    () => res.json({ ok: true })
  );
});

app.post("/api/booking/reject", (req, res) => {
  db.query(
    "UPDATE transactions SET status='REJECTED' WHERE id=? AND status='OPEN'",
    [req.body.tx_id],
    () => res.json({ ok: true })
  );
});

/* =========================
   ADMIN FINAL RELEASE (ONLY)
========================= */
app.post("/api/admin/release", (req, res) => {
  const { tx_id, release_to } = req.body;

  db.query(
    "SELECT * FROM transactions WHERE id=?",
    [tx_id],
    (e, rows) => {
      const tx = rows[0];
      const uid = release_to === "BUYER" ? tx.buyer_id : tx.seller_id;

      db.query(
        "UPDATE users SET wallet = wallet + ? WHERE id=?",
        [tx.amount, uid],
        () => {
          db.query(
            "INSERT INTO wallet_ledger (user_id,type,amount,note) VALUES (?,?,?,?)",
            [uid, "CREDIT", tx.amount, "Admin final release"],
            () => {
              db.query(
                "UPDATE transactions SET status='COMPLETED' WHERE id=?",
                [tx_id],
                () => res.json({ ok: true })
              );
            }
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
