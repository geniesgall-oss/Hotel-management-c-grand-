import { Router } from "express";
import pool from "../db.js";
import { getSession } from "./auth.js";

const router = Router();

function requireAdmin(req: any, res: any): { id: number; username: string; role: string } | null {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return null; }
  if (session.role !== "admin") { res.status(403).json({ error: "Admin access required" }); return null; }
  return session;
}

router.get("/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { rows } = await pool.query(
      "SELECT id, username, role, email FROM users ORDER BY role DESC, username ASC"
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.post("/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { username, password, role, email } = req.body as {
    username: string; password: string; role: string; email?: string;
  };

  if (!username?.trim() || !password?.trim() || !role) {
    return res.status(400).json({ error: "Username, password, and role are required" });
  }
  if (!["admin", "staff"].includes(role)) {
    return res.status(400).json({ error: "Role must be 'admin' or 'staff'" });
  }

  try {
    const { rows: existing } = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username.trim()]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: `Username "${username}" is already taken` });
    }

    const { rows } = await pool.query(
      "INSERT INTO users (username, password, role, email) VALUES ($1, $2, $3, $4) RETURNING id, username, role, email",
      [username.trim(), password, role, email?.trim() || null]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.delete("/users/:id", async (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;

  const id = parseInt(req.params.id, 10);

  if (session.id === id) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  try {
    const { rows } = await pool.query("SELECT id FROM users WHERE id = $1", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });

    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    return res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

export default router;
