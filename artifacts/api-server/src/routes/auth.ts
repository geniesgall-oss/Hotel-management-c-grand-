import { Router } from "express";
import pool from "../db.js";
import crypto from "crypto";

const router = Router();

const sessions = new Map<string, { id: number; username: string; role: string; email: string | null }>();

export function getSession(token: string) {
  return sessions.get(token) ?? null;
}

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, username, role, email FROM users WHERE username = $1 AND password = $2",
      [username, password]
    );
    const user = rows[0] as { id: number; username: string; role: string; email: string | null } | undefined;

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { id: user.id, username: user.username, role: user.role, email: user.email });

    return res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, email: user.email },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.post("/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    sessions.delete(authHeader.slice(7));
  }
  return res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const session = sessions.get(authHeader.slice(7));
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return res.json({ id: session.id, username: session.username, role: session.role, email: session.email });
});

export default router;
