import { Router } from "express";
import pool from "../db.js";
import { getSession } from "./auth.js";

const router = Router();

const ALL_ROOMS = ["LV1","LV2","LV3","LV4","LV5","LV6","LV7","LV8","LV9","LV10","LV11","LV12"];

router.get("/rooms", async (_req, res) => {
  try {
    const { rows: bookingRows } = await pool.query(
      "SELECT id, guest_name, phone, room_number, check_in_time, room_amount, amount_paid, payment_method, due_amount, checked_in_by FROM bookings"
    );

    const { rows: dirtyRows } = await pool.query("SELECT room_number FROM dirty_rooms");
    const dirtySet = new Set(dirtyRows.map((r: { room_number: string }) => r.room_number));

    const occupiedMap = new Map(
      bookingRows.map((b: { room_number: string }) => [b.room_number, b])
    );

    // Fetch extras totals for all occupied bookings in one query
    const occupiedIds = bookingRows.map((b: { id: number }) => b.id);
    const extrasTotals = new Map<number, number>();

    if (occupiedIds.length > 0) {
      const placeholders = occupiedIds.map((_: unknown, i: number) => `$${i + 1}`).join(",");
      const { rows: extrasRows } = await pool.query(
        `SELECT booking_id, COALESCE(SUM(rate * qty), 0) as total FROM room_extras WHERE booking_id IN (${placeholders}) GROUP BY booking_id`,
        occupiedIds
      );
      for (const r of extrasRows) {
        extrasTotals.set(Number(r.booking_id), parseFloat(r.total) || 0);
      }
    }

    const rooms = ALL_ROOMS.map((number, idx) => {
      const booking = occupiedMap.get(number) as {
        id: number; guest_name: string; phone: string; room_number: string;
        check_in_time: string; room_amount: number; amount_paid: number;
        payment_method: string; due_amount: number; checked_in_by: string;
      } | undefined;

      let status: "available" | "occupied" | "dirty";
      if (booking) {
        status = "occupied";
      } else if (dirtySet.has(number)) {
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
              roomAmount: Number(booking.room_amount),
              amountPaid: Number(booking.amount_paid),
              paymentMethod: booking.payment_method,
              dueAmount: Number(booking.due_amount),
              checkedInBy: booking.checked_in_by,
              extrasTotal: extrasTotals.get(booking.id) ?? 0,
            }
          : null,
      };
    });

    return res.json(rooms);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.put("/rooms/:number/clean", async (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const roomNumber = req.params.number;
  if (!ALL_ROOMS.includes(roomNumber)) {
    return res.status(404).json({ error: "Room not found" });
  }

  try {
    await pool.query("DELETE FROM dirty_rooms WHERE room_number = $1", [roomNumber]);
    return res.json({ success: true, message: `Room ${roomNumber} is now clean and available` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

export default router;
