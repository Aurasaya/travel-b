const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require("path");

const app = express();

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

// สร้างตาราง reviews
db.run(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    rating INTEGER NOT NULL,
    review TEXT NOT NULL
  )
`);

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
  const { username, rating, review } = req.body;

  if (!username || !rating || !review) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // บันทึกรีวิวลงในฐานข้อมูล
  db.run(
    "INSERT INTO reviews (username, rating, review) VALUES (?, ?, ?)",
    [username, rating, review],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Error inserting review" });
      }
      res.redirect("/");
    }
  );
});

// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 7001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
