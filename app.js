const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const db = new sqlite3.Database("./reviews.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      country TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.post("/add-review", (req, res) => {
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
        console.error("Error inserting review:", err.message);
        return res.status(500).json({ message: "Failed to add review" });
      }
      res
        .status(201)
        .json({ message: "Review added successfully", reviewId: this.lastID });
    }
  );
});

// หน้ารีวิวหลัก
app.get("/reviews", (req, res) => {
  db.all("SELECT * FROM reviews ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลรีวิว" });
    }
    res.json(rows); // ส่งข้อมูลรีวิวเป็น JSON
  });
});
app.put("/reviews/:id", (req, res) => {
  const { id } = req.params;
  const { country, title, content, rating } = req.body;

  if (!country || !title || !content || !rating) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.run(
    "UPDATE reviews SET country = ?, title = ?, content = ?, rating = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [title, content, rating, id],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Error updating review" });
      }
      res.json({ message: "Review updated successfully" });
    }
  );
});

const PORT = process.env.PORT || 7001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
