const express = require("express");
const path = require("path");
const mysql = require("mysql2");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- MYSQL CONNECTION ----------
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

// ---------- HOME ----------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------- INIT DB (ONE TIME) ----------
app.get("/init-db", (req, res) => {

  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone VARCHAR(20),
      role VARCHAR(20),
      wallet DECIMAL(12,2) DEFAULT 0
    )
  `;

  const txTable = `
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      buyer_id INT,
      seller_id INT,
      amount DECIMAL(12,2),
      status VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(usersTable);
  db.query(txTable);

  res.send("Database initialized");
});

// ---------- HEALTH ----------
app.get("/health", (req, res) => {
  res.send("OK");
});

// ---------- PORT ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("SERVER STARTED ON PORT " + PORT);
});
