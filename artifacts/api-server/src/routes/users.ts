import { Router } from "express";
import db from "../db.js";
import { getSession } from "./auth.js";

const router = Router();

function requireAdmin(req: any, res: any): { id: number; username: string; role: string } | null {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return null; }
  if (session.role !== "admin") { res.status(403).json({ error: "Admin access required" }); return null; }
  return session;
}

router.get("/users", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const users = db.prepare(
    "SELECT id, username, role, email FROM users ORDER BY role DESC, username ASC"
  ).all() as { id: number; username: string; role: string; email: string | null }[];
  return res.json(users);
});

router.post("/users", (req, res) => {
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

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username.trim());
  if (existing) return res.status(400).json({ error: `Username "${username}" is already taken` });

  const result = db
    .prepare("INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)")
    .run(username.trim(), password, role, email?.trim() || null) as { lastInsertRowid: number };

  const user = db.prepare("SELECT id, username, role, email FROM users WHERE id = ?").get(result.lastInsertRowid) as {
    id: number; username: string; role: string; email: string | null;
  };
  return res.status(201).json(user);
});

router.delete("/users/:id", (req, res) => {
  const session = requireAdmin(req, res);
  if (!session) return;

  const id = parseInt(req.params.id, 10);

  // Prevent deleting yourself
  if (session.id === id) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as { id: number; username: string } | undefined;
  if (!user) return res.status(404).json({ error: "User not found" });

  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return res.json({ success: true, message: "User deleted" });
});

export default router;
