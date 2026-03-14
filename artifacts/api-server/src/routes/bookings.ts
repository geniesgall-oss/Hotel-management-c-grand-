import { Router } from "express";
import db from "../db.js";
import { getSession } from "./auth.js";

const router = Router();

router.get("/bookings", (_req, res) => {
  const bookings = db.prepare(
    "SELECT id, guest_name, phone, room_number, check_in_time FROM bookings ORDER BY check_in_time DESC"
  ).all() as { id: number; guest_name: string; phone: string; room_number: string; check_in_time: string }[];

  return res.json(
    bookings.map(b => ({
      id: b.id,
      guestName: b.guest_name,
      phone: b.phone,
      roomNumber: b.room_number,
      checkInTime: b.check_in_time,
    }))
  );
});

router.post("/bookings", (req, res) => {
  const { guestName, phone, roomNumber } = req.body as { guestName: string; phone: string; roomNumber: string };

  if (!guestName || !phone || !roomNumber) {
    return res.status(400).json({ error: "Guest name, phone, and room number are required" });
  }

  const existing = db.prepare("SELECT id FROM bookings WHERE room_number = ?").get(roomNumber);
  if (existing) {
    return res.status(400).json({ error: `Room ${roomNumber} is already occupied` });
  }

  const checkInTime = new Date().toISOString();
  const result = db
    .prepare("INSERT INTO bookings (guest_name, phone, room_number, check_in_time) VALUES (?, ?, ?, ?)")
    .run(guestName, phone, roomNumber, checkInTime) as { lastInsertRowid: number };

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(result.lastInsertRowid) as {
    id: number; guest_name: string; phone: string; room_number: string; check_in_time: string;
  };

  return res.status(201).json({
    id: booking.id,
    guestName: booking.guest_name,
    phone: booking.phone,
    roomNumber: booking.room_number,
    checkInTime: booking.check_in_time,
  });
});

router.delete("/bookings/:id", (req, res) => {
  const authHeader = req.headers.authorization;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;

  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (session.role !== "admin") {
    return res.status(403).json({ error: "Only admins can delete bookings" });
  }

  const id = parseInt(req.params.id, 10);
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
  return res.json({ success: true, message: "Booking deleted" });
});

router.post("/bookings/:id/checkout", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as {
    id: number; guest_name: string; phone: string; room_number: string; check_in_time: string;
  } | undefined;

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  const checkOutTime = new Date().toISOString();
  const result = db
    .prepare(
      "INSERT INTO history (guest_name, phone, room_number, check_in_time, check_out_time) VALUES (?, ?, ?, ?, ?)"
    )
    .run(booking.guest_name, booking.phone, booking.room_number, booking.check_in_time, checkOutTime) as {
    lastInsertRowid: number;
  };

  db.prepare("DELETE FROM bookings WHERE id = ?").run(id);

  const historyRecord = db.prepare("SELECT * FROM history WHERE id = ?").get(result.lastInsertRowid) as {
    id: number; guest_name: string; phone: string; room_number: string; check_in_time: string; check_out_time: string;
  };

  return res.json({
    id: historyRecord.id,
    guestName: historyRecord.guest_name,
    phone: historyRecord.phone,
    roomNumber: historyRecord.room_number,
    checkInTime: historyRecord.check_in_time,
    checkOutTime: historyRecord.check_out_time,
  });
});

export default router;
