import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "hotel.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    room_number TEXT NOT NULL,
    check_in_time TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    room_number TEXT NOT NULL,
    check_in_time TEXT NOT NULL,
    check_out_time TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const existingAdmin = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
if (!existingAdmin) {
  db.prepare("INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)").run(
    "admin", "admin123", "admin", "admin@hotel.com"
  );
}

const existingStaff = db.prepare("SELECT id FROM users WHERE username = ?").get("staff");
if (!existingStaff) {
  db.prepare("INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)").run(
    "staff", "staff123", "staff", null
  );
}

export default db;
