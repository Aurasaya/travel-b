const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require("path");

const app = express();
const cors = require("cors");
app.use(cors());

app.use(express.static(path.join(__dirname, "public"))); // ให้ Express ให้บริการไฟล์ในโฟลเดอร์ public

// ตั้งค่า body-parser สำหรับ parse JSON และ form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// สร้างการเชื่อมต่อฐานข้อมูล SQLite
const db = new sqlite3.Database("./reviews.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

// สร้างตารางรีวิว (reviews)
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,  // เชื่อมโยงกับผู้ใช้
      title TEXT NOT NULL,  // ชื่อรีวิว
      content TEXT NOT NULL,  // เนื้อหาของรีวิว
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  // เวลาที่รีวิวถูกสร้าง
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  // เวลาที่รีวิวถูกแก้ไข
      FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
});

// หน้ารีวิวหลัก
app.get("/", (req, res) => {
  db.all("SELECT * FROM reviews", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching reviews" });
    }
    res.render("index", { reviews: rows });
  });
});

// หน้าเพิ่มรีวิว
app.get("/add-review", (req, res) => {
  res.render("add-review");
});

// API สำหรับเพิ่มรีวิว
app.post("/add-review", (req, res) => {
  const { user_id, title, content, rating } = req.body;

  if (!user_id || !title || !content || !rating) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // บันทึกรีวิวลงในฐานข้อมูล
  db.run(
    "INSERT INTO reviews (user_id, title, content, created_at) VALUES (?, ?, ?, ?)",
    [user_id, title, content, rating],
    function (err) {
      if (err) {
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
  const { title, content, rating } = req.body;

  if (!title || !content || !rating) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.run(
    "UPDATE reviews SET title = ?, content = ?, rating = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [title, content, rating, id],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Error updating review" });
      }
      res.json({ message: "Review updated successfully" });
    }
  );
});

db.all("SELECT * FROM reviews ORDER BY created_at DESC", [], (err, rows) => {
  if (err) {
    return res.status(500).json({ message: "Error fetching reviews" });
  }
  res.render("index", { reviews: rows });
});

// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 7001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
