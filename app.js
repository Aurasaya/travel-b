const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const sqlite = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
let sql;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

const db = new sqlite.Database("./users.db", (err) => {
  if (err) {
    console.error("Error connecting to SQLite database", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

//table user
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      fullname TEXT NOT NULL,
      password TEXT NOT NULL
  )`);
});

//API สำหรับการสมัคร (Register)
app.post("/register", (req, res) => {
  const { username, fullname, password } = req.body;

  //ตรวจสอบว่า Email มาจาก request หรือไม่
  if (!username || !fullname || !password) {
    return res
      .status(400)
      .json({ message: "username, fullname, and password are required" });
  }

  //เข้ารหัสรหัสผ่านด้วย bcrypt
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ message: "Error hashing password" });
    }

    //บันทึกผู้ใช้ใหม่ลงในฐานข้อมูล
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

//API สำหรับการล็อกอิน (Login)
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  console.log(req);

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  //ดึงข้อมูลผู้ใช้จากฐานข้อมูล
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error fetching user from database" });
    }

    if (!row) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    //ตรวจสอบรหัสผ่านที่เข้ารหัสแล้ว
    bcrypt.compare(password, row.password, (err, result) => {
      if (err || !result) {
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      //สร้าง JWT Token
      const token = jwt.sign(
        { id: row.id, username: row.username },
        "secret_key",
        {
          expiresIn: "1h",
        }
      );

      res.status(200).json({
        message: "Login successful",
        token: token,
      });
    });
  });
});

//API สำหรับการล็อกอิน (Login)
app.get("/login", (req, res) => {
  //ดึงข้อมูลผู้ใช้จากฐานข้อมูล
  db.get("SELECT * FROM users ", [], (err, row) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error fetching user from database" });
    }
    return res.status(200).json(row);
  });
});

//ตั้งค่าให้ server ทำงานที่ port 7001
app.listen(7001, () => {
  console.log("Server is running on http://localhost:7001");
});
