const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allow localhost:3000 always for local dev
const allowedOrigins = [
  "http://localhost:3000",
  process.env.CORS_ORIGIN  // from .env for production ALB URL
].filter(Boolean);

app.use(express.json());

// ✔ FIXED — new CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like curl/Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS Blocked Origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize database tables
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    connection.release();
    console.log("Database tables initialized");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
}

// Routes
app.get("/health", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: "unhealthy", error: err.message });
  }
});

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM users ORDER BY created_at DESC"
    );
    connection.release();

    res.json({
      success: true,
      data: rows,
      count: rows.length,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create user
app.post("/api/users", async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email) {
    return res
      .status(400)
      .json({ success: false, error: "Name and email are required" });
  }

  try {
    const connection = await pool.getConnection();
    const result = await connection.execute(
      "INSERT INTO users (name, email, phone) VALUES (?, ?, ?)",
      [name, email, phone || null]
    );
    connection.release();

    res.status(201).json({
      success: true,
      message: "User created",
      userId: result[0].insertId,
    });
  } catch (err) {
    console.error("Error creating user:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ success: false, error: "Email already exists" });
    }

    res.status(500).json({ success: false, error: err.message });
  }
});

// Update user
app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;

  if (!name || !email) {
    return res
      .status(400)
      .json({ success: false, error: "Name and email are required" });
  }

  try {
    const connection = await pool.getConnection();
    const result = await connection.execute(
      "UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?",
      [name, email, phone || null, id]
    );
    connection.release();

    if (result[0].affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, error: "User not found" });
    }

    res.json({ success: true, message: "User updated" });
  } catch (err) {
    console.error("Error updating user:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ success: false, error: "Email already exists" });
    }

    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete user
app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await pool.getConnection();
    const result = await connection.execute(
      "DELETE FROM users WHERE id = ?",
      [id]
    );
    connection.release();

    if (result[0].affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, error: "User not found" });
    }

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Allowed Origins →`, allowedOrigins);
  await initializeDatabase();
});
