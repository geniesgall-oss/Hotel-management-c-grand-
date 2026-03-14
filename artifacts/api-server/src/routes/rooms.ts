import { Router } from "express";
import db from "../db.js";
import { getSession } from "./auth.js";

const router = Router();

const ALL_ROOMS = ["LV1","LV2","LV3","LV4","LV5","LV6","LV7","LV8","LV9","LV10","LV11","LV12"];

router.get("/rooms", (_req, res) => {
  const activeBookings = db.prepare(
    "SELECT id, guest_name, phone, room_number, check_in_time, room_amount, amount_paid, payment_method, due_amount, checked_in_by FROM bookings"
  ).all() as {
    id: number; guest_name: string; phone: string; room_number: string; check_in_time: string;
    room_amount: number; amount_paid: number; payment_method: string; due_amount: number; checked_in_by: string;
  }[];

  const dirtyRooms = new Set(
    (db.prepare("SELECT room_number FROM dirty_rooms").all() as { room_number: string }[]).map(r => r.room_number)
  );

  const occupiedMap = new Map(activeBookings.map(b => [b.room_number, b]));

  const rooms = ALL_ROOMS.map((number, idx) => {
    const booking = occupiedMap.get(number);
    let status: "available" | "occupied" | "dirty";
    if (booking) {
      status = "occupied";
    } else if (dirtyRooms.has(number)) {
      status = "dirty";
    } else {
      status = "available";
    }

    return {
      id: idx + 1,
      number,
      status,
      currentBooking: booking
        ? {
            id: booking.id,
            guestName: booking.guest_name,
            phone: booking.phone,
            roomNumber: booking.room_number,
            checkInTime: booking.check_in_time,
            roomAmount: booking.room_amount,
            amountPaid: booking.amount_paid,
            paymentMethod: booking.payment_method,
            dueAmount: booking.due_amount,
            checkedInBy: booking.checked_in_by,
          }
        : null,
    };
  });

  return res.json(rooms);
});

// Mark room as clean (available)
router.put("/rooms/:number/clean", (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const roomNumber = req.params.number;
  if (!ALL_ROOMS.includes(roomNumber)) {
    return res.status(404).json({ error: "Room not found" });
  }

  db.prepare("DELETE FROM dirty_rooms WHERE room_number = ?").run(roomNumber);
  return res.json({ success: true, message: `Room ${roomNumber} is now clean and available` });
});

export default router;
