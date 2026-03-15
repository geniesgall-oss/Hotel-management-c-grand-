import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
      email TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      guest_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      room_number TEXT NOT NULL,
      check_in_time TEXT NOT NULL,
      room_amount REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      due_amount REAL NOT NULL DEFAULT 0,
      checked_in_by TEXT NOT NULL DEFAULT ''
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS history (
      id SERIAL PRIMARY KEY,
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
      extras_total REAL NOT NULL DEFAULT 0,
      checkout_splits TEXT NOT NULL DEFAULT '[]'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dirty_rooms (
      room_number TEXT PRIMARY KEY
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS room_extras (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      rate REAL NOT NULL DEFAULT 0,
      qty INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT ''
    )
  `);

  // Remove legacy default accounts if they exist
  await pool.query("DELETE FROM users WHERE username = 'admin'");
  await pool.query("DELETE FROM users WHERE username = 'staff'");

  // Seed Bhargav as the default admin only if no admin exists
  const { rows } = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (rows.length === 0) {
    await pool.query(
      "INSERT INTO users (username, password, role, email) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING",
      ["Bhargav", "00078", "admin", null]
    );
  }

  console.log("[db] PostgreSQL tables ready");
}

export async function purgeOldHistory(): Promise<number> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 2);
  const result = await pool.query(
    "DELETE FROM history WHERE check_out_time < $1",
    [cutoff.toISOString()]
  );
  const count = result.rowCount ?? 0;
  if (count > 0) {
    console.log(`[purge] Deleted ${count} history record(s) older than 2 months`);
  }
  return count;
}

export default pool;
