import { Router } from "express";
import pool from "../db.js";
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

type ExtraRow = {
  id: number;
  booking_id: number;
  item_name: string;
  rate: number;
  qty: number;
  created_at: string;
};

async function getExtrasTotal(bookingId: number): Promise<number> {
  const { rows } = await pool.query(
    "SELECT COALESCE(SUM(rate * qty), 0) as total FROM room_extras WHERE booking_id = $1",
    [bookingId]
  );
  return parseFloat(rows[0]?.total) || 0;
}

function toExtra(e: ExtraRow) {
  return {
    id: e.id,
    bookingId: e.booking_id,
    itemName: e.item_name,
    rate: Number(e.rate),
    qty: Number(e.qty),
    createdAt: e.created_at,
  };
}

async function toBooking(b: BookingRow) {
  const extrasTotal = await getExtrasTotal(b.id);
  return {
    id: b.id,
    guestName: b.guest_name,
    phone: b.phone,
    roomNumber: b.room_number,
    checkInTime: b.check_in_time,
    roomAmount: Number(b.room_amount),
    amountPaid: Number(b.amount_paid),
    paymentMethod: b.payment_method,
    dueAmount: Number(b.due_amount),
    checkedInBy: b.checked_in_by,
    extrasTotal,
  };
}

router.get("/bookings", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, guest_name, phone, room_number, check_in_time, room_amount, amount_paid, payment_method, due_amount, checked_in_by FROM bookings ORDER BY check_in_time DESC"
    );
    const bookings = await Promise.all((rows as BookingRow[]).map(toBooking));
    return res.json(bookings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.get("/bookings/:id/extras", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const { rows: found } = await pool.query("SELECT id FROM bookings WHERE id = $1", [id]);
    if (found.length === 0) return res.status(404).json({ error: "Booking not found" });

    const { rows } = await pool.query(
      "SELECT id, booking_id, item_name, rate, qty, created_at FROM room_extras WHERE booking_id = $1 ORDER BY created_at ASC",
      [id]
    );
    return res.json((rows as ExtraRow[]).map(toExtra));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.post("/bookings/:id/extras", async (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const id = parseInt(req.params.id, 10);
  const { itemName, rate, qty } = req.body as { itemName: string; rate: number; qty?: number };

  if (!itemName?.trim()) return res.status(400).json({ error: "Item name is required" });
  if (!rate || Number(rate) <= 0) return res.status(400).json({ error: "Rate must be greater than 0" });

  try {
    const { rows: found } = await pool.query("SELECT id FROM bookings WHERE id = $1", [id]);
    if (found.length === 0) return res.status(404).json({ error: "Booking not found" });

    const now = new Date().toISOString();
    const { rows } = await pool.query(
      "INSERT INTO room_extras (booking_id, item_name, rate, qty, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, booking_id, item_name, rate, qty, created_at",
      [id, itemName.trim(), Number(rate), Math.max(1, Number(qty) || 1), now]
    );
    return res.status(201).json(toExtra(rows[0] as ExtraRow));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.delete("/bookings/:id/extras/:extraId", async (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const id = parseInt(req.params.id, 10);
  const extraId = parseInt(req.params.extraId, 10);

  try {
    const { rows } = await pool.query(
      "SELECT id FROM room_extras WHERE id = $1 AND booking_id = $2",
      [extraId, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Extra not found" });

    await pool.query("DELETE FROM room_extras WHERE id = $1", [extraId]);
    return res.json({ success: true, message: "Extra removed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.post("/bookings", async (req, res) => {
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

  try {
    const { rows: existing } = await pool.query(
      "SELECT id FROM bookings WHERE room_number = $1",
      [roomNumber]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: `Room ${roomNumber} is already occupied` });
    }

    await pool.query("DELETE FROM dirty_rooms WHERE room_number = $1", [roomNumber]);

    const checkInTime = new Date().toISOString();
    const totalAmount = Number(roomAmount) || 0;
    const paid = Number(amountPaid) || 0;
    const due = Math.max(0, totalAmount - paid);

    const { rows } = await pool.query(
      `INSERT INTO bookings
        (guest_name, phone, room_number, check_in_time, room_amount, amount_paid, payment_method, due_amount, checked_in_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, guest_name, phone, room_number, check_in_time, room_amount, amount_paid, payment_method, due_amount, checked_in_by`,
      [guestName, phone, roomNumber, checkInTime, totalAmount, paid, paymentMethod || "Cash", due, session.username]
    );

    return res.status(201).json(await toBooking(rows[0] as BookingRow));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.put("/bookings/:id", async (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  if (session.role !== "admin") return res.status(403).json({ error: "Only admins can edit bookings" });

  const id = parseInt(req.params.id, 10);
  const { guestName, phone, roomAmount, amountPaid, paymentMethod } = req.body as {
    guestName: string; phone: string;
    roomAmount: number; amountPaid: number; paymentMethod: string;
  };

  if (!guestName || !phone) {
    return res.status(400).json({ error: "Guest name and phone are required" });
  }

  try {
    const { rows: existing } = await pool.query(
      "SELECT id FROM bookings WHERE id = $1",
      [id]
    );
    if (existing.length === 0) return res.status(404).json({ error: "Booking not found" });

    const totalAmount = Number(roomAmount) || 0;
    const paid = Number(amountPaid) || 0;
    const due = Math.max(0, totalAmount - paid);

    const { rows } = await pool.query(
      `UPDATE bookings
       SET guest_name=$1, phone=$2, room_amount=$3, amount_paid=$4, payment_method=$5, due_amount=$6
       WHERE id=$7
       RETURNING id, guest_name, phone, room_number, check_in_time, room_amount, amount_paid, payment_method, due_amount, checked_in_by`,
      [guestName, phone, totalAmount, paid, paymentMethod || "Cash", due, id]
    );

    return res.json(await toBooking(rows[0] as BookingRow));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.delete("/bookings/:id", async (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  if (session.role !== "admin") return res.status(403).json({ error: "Only admins can delete bookings" });

  const id = parseInt(req.params.id, 10);

  try {
    const { rows } = await pool.query(
      "SELECT room_number FROM bookings WHERE id = $1",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Booking not found" });

    const roomNumber = rows[0].room_number as string;
    await pool.query("DELETE FROM bookings WHERE id = $1", [id]);
    await pool.query(
      "INSERT INTO dirty_rooms (room_number) VALUES ($1) ON CONFLICT (room_number) DO NOTHING",
      [roomNumber]
    );
    return res.json({ success: true, message: "Booking deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.post("/bookings/:id/checkout", async (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const id = parseInt(req.params.id, 10);
  type PaymentSplit = { method: string; amount: number };
  const { paymentSplits } = req.body as { paymentSplits: PaymentSplit[] };

  try {
    const { rows: bookingRows } = await pool.query(
      "SELECT id, guest_name, phone, room_number, check_in_time, room_amount, amount_paid, payment_method, due_amount, checked_in_by FROM bookings WHERE id = $1",
      [id]
    );
    if (bookingRows.length === 0) return res.status(404).json({ error: "Booking not found" });

    const booking = bookingRows[0] as BookingRow;
    const extrasTotal = await getExtrasTotal(id);
    const checkOutTime = new Date().toISOString();

    const splits: PaymentSplit[] = Array.isArray(paymentSplits)
      ? paymentSplits.filter(s => Number(s.amount) > 0).map(s => ({ method: s.method, amount: Number(s.amount) }))
      : [];

    const duePaid = splits.reduce((sum, s) => sum + s.amount, 0);
    const totalPaid = Number(booking.amount_paid) + duePaid;

    const primaryMethod = splits.length === 1
      ? splits[0].method
      : splits.length > 1 ? "Multiple" : "Cash";

    const splitsJson = JSON.stringify(splits);

    const { rows: histRows } = await pool.query(
      `INSERT INTO history
        (guest_name, phone, room_number, check_in_time, check_out_time,
         room_amount, amount_paid_at_checkin, payment_method_at_checkin,
         due_amount_paid_at_checkout, due_payment_method_at_checkout, total_paid,
         checked_in_by, checked_out_by, extras_total, checkout_splits)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        booking.guest_name, booking.phone, booking.room_number,
        booking.check_in_time, checkOutTime,
        Number(booking.room_amount), Number(booking.amount_paid), booking.payment_method,
        duePaid, primaryMethod, totalPaid,
        booking.checked_in_by, session.username, extrasTotal, splitsJson,
      ]
    );

    await pool.query("DELETE FROM bookings WHERE id = $1", [id]);
    await pool.query(
      "INSERT INTO dirty_rooms (room_number) VALUES ($1) ON CONFLICT (room_number) DO NOTHING",
      [booking.room_number]
    );

    const record = histRows[0];
    return res.json({
      id: record.id,
      guestName: record.guest_name,
      phone: record.phone,
      roomNumber: record.room_number,
      checkInTime: record.check_in_time,
      checkOutTime: record.check_out_time,
      roomAmount: Number(record.room_amount),
      amountPaidAtCheckin: Number(record.amount_paid_at_checkin),
      paymentMethodAtCheckin: record.payment_method_at_checkin,
      dueAmountPaidAtCheckout: Number(record.due_amount_paid_at_checkout),
      duePaymentMethodAtCheckout: record.due_payment_method_at_checkout,
      totalPaid: Number(record.total_paid),
      checkedInBy: record.checked_in_by,
      checkedOutBy: record.checked_out_by,
      extrasTotal: Number(record.extras_total),
      checkoutSplits: JSON.parse(record.checkout_splits || "[]"),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

export default router;
