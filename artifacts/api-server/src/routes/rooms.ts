import { Router } from "express";
import db from "../db.js";

const router = Router();

const ALL_ROOMS = ["LV1","LV2","LV3","LV4","LV5","LV6","LV7","LV8","LV9","LV10","LV11","LV12"];

router.get("/rooms", (_req, res) => {
  const activeBookings = db.prepare(
    "SELECT id, guest_name, phone, room_number, check_in_time, room_amount, amount_paid, payment_method, due_amount FROM bookings"
  ).all() as {
    id: number; guest_name: string; phone: string; room_number: string; check_in_time: string;
    room_amount: number; amount_paid: number; payment_method: string; due_amount: number;
  }[];

  const occupiedMap = new Map(activeBookings.map(b => [b.room_number, b]));

  const rooms = ALL_ROOMS.map((number, idx) => {
    const booking = occupiedMap.get(number);
    return {
      id: idx + 1,
      number,
      status: booking ? "occupied" : "available",
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
          }
        : null,
    };
  });

  return res.json(rooms);
});

export default router;
