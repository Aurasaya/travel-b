const express = require("express");
const bodyParser = require("body-parser");
const sqlite = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const ejs = require("ejs");
require("dotenv").config();

const app = express();

// Configurations
app.use(cors());
app.use(express.static(path.join(__dirname, "public"))); // Static files
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// SQLite database connection
const db = new sqlite.Database("./travel.db", (err) => {
  if (err) {
    console.error("Error connecting to SQLite database", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    db.run("PRAGMA foreign_keys = ON;"); // Enable foreign key constraints
  }
});

// Create tables
db.serialize(() => {
  // Table: users
  db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      fullname TEXT NOT NULL,
      password TEXT NOT NULL
  )`);

  // Table: reviews
  db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      country TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
});

// Register API
app.post("/register", (req, res) => {
  const { username, fullname, password } = req.body;

  if (!username || !fullname || !password) {
    return res
      .status(400)
      .json({ message: "Username, fullname, and password are required" });
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ message: "Error hashing password" });
    }

    db.run(
      "INSERT INTO users (username, fullname, password) VALUES (?, ?, ?)",
      [username, fullname, hashedPassword],
      function (err) {
        if (err) {
          return res
            .status(500)
            .json({ message: "Error saving user to database" });
        }
        res.status(201).json({ message: "User registered successfully" });
      }
    );
  });
});

// Login API
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error fetching user from database" });
    }

    if (!row) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    bcrypt.compare(password, row.password, (err, result) => {
      if (err || !result) {
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      const token = jwt.sign(
        { id: row.id, username: row.username },
        process.env.JWT_SECRET || "secret_key",
        { expiresIn: "1h" }
      );

      res.status(200).json({ message: "Login successful", token });
    });
  });
});

// Reviews API
app.get("/reviews", (req, res) => {
  db.all("SELECT * FROM reviews ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching reviews" });
    }
    res.json({ reviews: rows });
  });
});
app.get("/reviews/:id", (req, res) => {
  const { id } = req.params; // รับ id จาก URL

  db.get("SELECT * FROM reviews WHERE id = ?", [id], (err, row) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลรีวิว" });
    }

    if (!row) {
      return res.status(404).json({ message: "ไม่พบรีวิวที่มี id นี้" });
    }

    res.json(row); // ส่งข้อมูลรีวิวเป็น JSON
  });
});

app.post("/reviews", (req, res) => {
  const { user_id, country, title, content, rating, created_at, updated_at } =
    req.body;

  if (
    !user_id ||
    !country ||
    !title ||
    !content ||
    !rating ||
    !created_at ||
    !updated_at
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.run(
    "INSERT INTO reviews (user_id, country, title, content, rating, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [user_id, country, title, content, rating, created_at, updated_at],
    function (err) {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Error inserting review" });
      }
      res
        .status(201)
        .json({ message: "Review added successfully", id: this.lastID });
    }
  );
});

app.put("/reviews/:id", (req, res) => {
  const { id } = req.params;
  const { country, title, content, rating, created_at, update_at } = req.body;

  if (!country || !title || !content || !rating || !created_at || !update_at) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.run(
    "UPDATE reviews SET country = ?, title = ?, content = ?, rating = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [country, title, content, rating, id, created_at, update_at],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Error updating review" });
      }
      res.json({ message: "Review updated successfully" });
    }
  );
});

// Protected route for user profile
app.get("/profile", (req, res) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, process.env.JWT_SECRET || "secret_key", (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    db.get("SELECT * FROM users WHERE id = ?", [decoded.id], (err, row) => {
      if (err || !row) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user: row });
    });
  });
});
app.delete("/reviews/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM reviews WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ message: "Error deleting review" });
    }

    // หากไม่มีแถวในตารางที่ถูกลบ จะเช็คว่า affected rows เป็น 0
    if (this.changes === 0) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ message: "Review deleted successfully" });
  });
});

// Server setup
const PORT = 7001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
