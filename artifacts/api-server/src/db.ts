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
    room_amount REAL NOT NULL DEFAULT 0,
    amount_paid REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    due_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    room_number TEXT NOT NULL,
    check_in_time TEXT NOT NULL,
    check_out_time TEXT NOT NULL,
    room_amount REAL NOT NULL DEFAULT 0,
    amount_paid_at_checkin REAL NOT NULL DEFAULT 0,
    payment_method_at_checkin TEXT NOT NULL DEFAULT 'Cash',
    due_amount_paid_at_checkout REAL NOT NULL DEFAULT 0,
    due_payment_method_at_checkout TEXT NOT NULL DEFAULT 'Cash',
    total_paid REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migrate bookings columns
const bookingColumns = (db.prepare("PRAGMA table_info(bookings)").all() as { name: string }[]).map(c => c.name);
if (!bookingColumns.includes("room_amount")) db.exec("ALTER TABLE bookings ADD COLUMN room_amount REAL NOT NULL DEFAULT 0");
if (!bookingColumns.includes("amount_paid")) db.exec("ALTER TABLE bookings ADD COLUMN amount_paid REAL NOT NULL DEFAULT 0");
if (!bookingColumns.includes("payment_method")) db.exec("ALTER TABLE bookings ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'Cash'");
if (!bookingColumns.includes("due_amount")) db.exec("ALTER TABLE bookings ADD COLUMN due_amount REAL NOT NULL DEFAULT 0");

// Migrate history columns
const historyColumns = (db.prepare("PRAGMA table_info(history)").all() as { name: string }[]).map(c => c.name);
if (!historyColumns.includes("room_amount")) db.exec("ALTER TABLE history ADD COLUMN room_amount REAL NOT NULL DEFAULT 0");
if (!historyColumns.includes("amount_paid_at_checkin")) db.exec("ALTER TABLE history ADD COLUMN amount_paid_at_checkin REAL NOT NULL DEFAULT 0");
if (!historyColumns.includes("payment_method_at_checkin")) db.exec("ALTER TABLE history ADD COLUMN payment_method_at_checkin TEXT NOT NULL DEFAULT 'Cash'");
if (!historyColumns.includes("due_amount_paid_at_checkout")) db.exec("ALTER TABLE history ADD COLUMN due_amount_paid_at_checkout REAL NOT NULL DEFAULT 0");
if (!historyColumns.includes("due_payment_method_at_checkout")) db.exec("ALTER TABLE history ADD COLUMN due_payment_method_at_checkout TEXT NOT NULL DEFAULT 'Cash'");
if (!historyColumns.includes("total_paid")) db.exec("ALTER TABLE history ADD COLUMN total_paid REAL NOT NULL DEFAULT 0");

// Remove old default admin/staff if they exist, then seed correct credentials
const oldAdmin = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (oldAdmin) db.prepare("DELETE FROM users WHERE username = 'admin'").run();

const oldStaff = db.prepare("SELECT id FROM users WHERE username = 'staff'").get();
if (oldStaff) db.prepare("DELETE FROM users WHERE username = 'staff'").run();

// Seed Bhargav as the main admin (only if no admin exists at all)
const anyAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
if (!anyAdmin) {
  db.prepare("INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)").run(
    "Bhargav", "00078", "admin", null
  );
}

export default db;
