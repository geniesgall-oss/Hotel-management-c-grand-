import Database from "better-sqlite3";
import path from "path";

// Robust DB path resolution that works in both ESM dev (tsx) and CJS production bundle.
// import.meta.url is undefined when bundled to CJS by esbuild, so we use process.argv[1]
// which points to the running file in both modes.
function resolveDbPath(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  // process.argv[1] = path to running script, e.g.:
  //   dev:  .../artifacts/api-server/src/index.ts  → parent = src/ → ../hotel.db = api-server/hotel.db
  //   prod: .../artifacts/api-server/dist/index.cjs → parent = dist/ → ../hotel.db = api-server/hotel.db
  const scriptDir = path.dirname(path.resolve(process.argv[1] ?? ""));
  return path.join(scriptDir, "..", "hotel.db");
}

const DB_PATH = resolveDbPath();

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
    checked_in_by TEXT NOT NULL DEFAULT '',
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
    checked_in_by TEXT NOT NULL DEFAULT '',
    checked_out_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dirty_rooms (
    room_number TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS room_extras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    rate REAL NOT NULL DEFAULT 0,
    qty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migrate bookings columns
const bookingColumns = (db.prepare("PRAGMA table_info(bookings)").all() as { name: string }[]).map(c => c.name);
if (!bookingColumns.includes("room_amount"))    db.exec("ALTER TABLE bookings ADD COLUMN room_amount REAL NOT NULL DEFAULT 0");
if (!bookingColumns.includes("amount_paid"))    db.exec("ALTER TABLE bookings ADD COLUMN amount_paid REAL NOT NULL DEFAULT 0");
if (!bookingColumns.includes("payment_method")) db.exec("ALTER TABLE bookings ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'Cash'");
if (!bookingColumns.includes("due_amount"))     db.exec("ALTER TABLE bookings ADD COLUMN due_amount REAL NOT NULL DEFAULT 0");
if (!bookingColumns.includes("checked_in_by"))  db.exec("ALTER TABLE bookings ADD COLUMN checked_in_by TEXT NOT NULL DEFAULT ''");

// Migrate history columns
const historyColumns = (db.prepare("PRAGMA table_info(history)").all() as { name: string }[]).map(c => c.name);
if (!historyColumns.includes("room_amount"))                    db.exec("ALTER TABLE history ADD COLUMN room_amount REAL NOT NULL DEFAULT 0");
if (!historyColumns.includes("amount_paid_at_checkin"))         db.exec("ALTER TABLE history ADD COLUMN amount_paid_at_checkin REAL NOT NULL DEFAULT 0");
if (!historyColumns.includes("payment_method_at_checkin"))      db.exec("ALTER TABLE history ADD COLUMN payment_method_at_checkin TEXT NOT NULL DEFAULT 'Cash'");
if (!historyColumns.includes("due_amount_paid_at_checkout"))    db.exec("ALTER TABLE history ADD COLUMN due_amount_paid_at_checkout REAL NOT NULL DEFAULT 0");
if (!historyColumns.includes("due_payment_method_at_checkout")) db.exec("ALTER TABLE history ADD COLUMN due_payment_method_at_checkout TEXT NOT NULL DEFAULT 'Cash'");
if (!historyColumns.includes("total_paid"))                     db.exec("ALTER TABLE history ADD COLUMN total_paid REAL NOT NULL DEFAULT 0");
if (!historyColumns.includes("checked_in_by"))                  db.exec("ALTER TABLE history ADD COLUMN checked_in_by TEXT NOT NULL DEFAULT ''");
if (!historyColumns.includes("checked_out_by"))                 db.exec("ALTER TABLE history ADD COLUMN checked_out_by TEXT NOT NULL DEFAULT ''");
if (!historyColumns.includes("extras_total"))                   db.exec("ALTER TABLE history ADD COLUMN extras_total REAL NOT NULL DEFAULT 0");

// Remove old default admin/staff if they exist
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
