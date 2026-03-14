import { Router } from "express";
import db from "../db.js";
import { getSession } from "./auth.js";

const router = Router();

type BookingRow = {
  id: number;
  guest_name: string;
  phone: string;
  room_number: string;
  check_in_time: string;
  room_amount: number;
  amount_paid: number;
  payment_method: string;
  due_amount: number;
  checked_in_by: string;
};

function toBooking(b: BookingRow) {
  return {
    id: b.id,
    guestName: b.guest_name,
    phone: b.phone,
    roomNumber: b.room_number,
    checkInTime: b.check_in_time,
    roomAmount: b.room_amount,
    amountPaid: b.amount_paid,
    paymentMethod: b.payment_method,
    dueAmount: b.due_amount,
    checkedInBy: b.checked_in_by,
  };
}

router.get("/bookings", (_req, res) => {
  const bookings = db.prepare(
    "SELECT id, guest_name, phone, room_number, check_in_time, room_amount, amount_paid, payment_method, due_amount, checked_in_by FROM bookings ORDER BY check_in_time DESC"
  ).all() as BookingRow[];
  return res.json(bookings.map(toBooking));
});

router.post("/bookings", (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const { guestName, phone, roomNumber, roomAmount, amountPaid, paymentMethod } = req.body as {
    guestName: string; phone: string; roomNumber: string;
    roomAmount: number; amountPaid: number; paymentMethod: string;
  };

  if (!guestName || !phone || !roomNumber) {
    return res.status(400).json({ error: "Guest name, phone, and room number are required" });
  }

  const existing = db.prepare("SELECT id FROM bookings WHERE room_number = ?").get(roomNumber);
  if (existing) {
    return res.status(400).json({ error: `Room ${roomNumber} is already occupied` });
  }

  const checkInTime = new Date().toISOString();
  const totalAmount = Number(roomAmount) || 0;
  const paid = Number(amountPaid) || 0;
  const due = Math.max(0, totalAmount - paid);

  const result = db
    .prepare(
      "INSERT INTO bookings (guest_name, phone, room_number, check_in_time, room_amount, amount_paid, payment_method, due_amount, checked_in_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(guestName, phone, roomNumber, checkInTime, totalAmount, paid, paymentMethod || "Cash", due, session.username) as { lastInsertRowid: number };

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(result.lastInsertRowid) as BookingRow;
  return res.status(201).json(toBooking(booking));
});

// Admin: update booking (edit guest details / amounts)
router.put("/bookings/:id", (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  if (session.role !== "admin") return res.status(403).json({ error: "Only admins can edit bookings" });

  const id = parseInt(req.params.id, 10);
  const existing = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
  if (!existing) return res.status(404).json({ error: "Booking not found" });

  const { guestName, phone, roomAmount, amountPaid, paymentMethod } = req.body as {
    guestName: string; phone: string;
    roomAmount: number; amountPaid: number; paymentMethod: string;
  };

  if (!guestName || !phone) {
    return res.status(400).json({ error: "Guest name and phone are required" });
  }

  const totalAmount = Number(roomAmount) || 0;
  const paid = Number(amountPaid) || 0;
  const due = Math.max(0, totalAmount - paid);

  db.prepare(
    "UPDATE bookings SET guest_name=?, phone=?, room_amount=?, amount_paid=?, payment_method=?, due_amount=? WHERE id=?"
  ).run(guestName, phone, totalAmount, paid, paymentMethod || "Cash", due, id);

  const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow;
  return res.json(toBooking(updated));
});

// Admin: delete active booking
router.delete("/bookings/:id", (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  if (session.role !== "admin") return res.status(403).json({ error: "Only admins can delete bookings" });

  const id = parseInt(req.params.id, 10);
  const booking = db.prepare("SELECT id FROM bookings WHERE id = ?").get(id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
  return res.json({ success: true, message: "Booking deleted" });
});

router.post("/bookings/:id/checkout", (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const id = parseInt(req.params.id, 10);
  const { duePaymentMethod, dueAmountPaid } = req.body as { duePaymentMethod: string; dueAmountPaid: number };

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined;
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const checkOutTime = new Date().toISOString();
  const duePaid = Number(dueAmountPaid) || 0;
  const totalPaid = booking.amount_paid + duePaid;

  type HistoryRow = {
    id: number; guest_name: string; phone: string; room_number: string;
    check_in_time: string; check_out_time: string; room_amount: number;
    amount_paid_at_checkin: number; payment_method_at_checkin: string;
    due_amount_paid_at_checkout: number; due_payment_method_at_checkout: string;
    total_paid: number; checked_in_by: string; checked_out_by: string;
  };

  const result = db
    .prepare(
      `INSERT INTO history
       (guest_name, phone, room_number, check_in_time, check_out_time,
        room_amount, amount_paid_at_checkin, payment_method_at_checkin,
        due_amount_paid_at_checkout, due_payment_method_at_checkout, total_paid,
        checked_in_by, checked_out_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      booking.guest_name, booking.phone, booking.room_number,
      booking.check_in_time, checkOutTime,
      booking.room_amount, booking.amount_paid, booking.payment_method,
      duePaid, duePaymentMethod || "Cash", totalPaid,
      booking.checked_in_by, session.username
    ) as { lastInsertRowid: number };

  db.prepare("DELETE FROM bookings WHERE id = ?").run(id);

  const record = db.prepare("SELECT * FROM history WHERE id = ?").get(result.lastInsertRowid) as HistoryRow;

  return res.json({
    id: record.id,
    guestName: record.guest_name,
    phone: record.phone,
    roomNumber: record.room_number,
    checkInTime: record.check_in_time,
    checkOutTime: record.check_out_time,
    roomAmount: record.room_amount,
    amountPaidAtCheckin: record.amount_paid_at_checkin,
    paymentMethodAtCheckin: record.payment_method_at_checkin,
    dueAmountPaidAtCheckout: record.due_amount_paid_at_checkout,
    duePaymentMethodAtCheckout: record.due_payment_method_at_checkout,
    totalPaid: record.total_paid,
    checkedInBy: record.checked_in_by,
    checkedOutBy: record.checked_out_by,
  });
});

export default router;
