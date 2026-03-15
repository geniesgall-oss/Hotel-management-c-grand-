import { Router } from "express";
import pool from "../db.js";
import { getSession } from "./auth.js";

const router = Router();

type HistoryRow = {
  id: number; guest_name: string; phone: string; room_number: string;
  check_in_time: string; check_out_time: string; room_amount: number;
  amount_paid_at_checkin: number; payment_method_at_checkin: string;
  due_amount_paid_at_checkout: number; due_payment_method_at_checkout: string;
  total_paid: number; checked_in_by: string; checked_out_by: string;
  extras_total?: number; checkout_splits?: string;
};

function toRecord(r: HistoryRow) {
  return {
    id: r.id,
    guestName: r.guest_name,
    phone: r.phone,
    roomNumber: r.room_number,
    checkInTime: r.check_in_time,
    checkOutTime: r.check_out_time,
    roomAmount: Number(r.room_amount),
    amountPaidAtCheckin: Number(r.amount_paid_at_checkin),
    paymentMethodAtCheckin: r.payment_method_at_checkin,
    dueAmountPaidAtCheckout: Number(r.due_amount_paid_at_checkout),
    duePaymentMethodAtCheckout: r.due_payment_method_at_checkout,
    totalPaid: Number(r.total_paid),
    checkedInBy: r.checked_in_by || "—",
    checkedOutBy: r.checked_out_by || "—",
    extrasTotal: Number(r.extras_total ?? 0),
    checkoutSplits: JSON.parse(r.checkout_splits || "[]"),
  };
}

router.get("/history", async (_req, res) => {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const cutoff = twoMonthsAgo.toISOString();

  try {
    const { rows } = await pool.query(
      "SELECT * FROM history WHERE check_out_time >= $1 ORDER BY check_out_time DESC",
      [cutoff]
    );
    return res.json((rows as HistoryRow[]).map(toRecord));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.put("/history/:id", async (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  if (session.role !== "admin") return res.status(403).json({ error: "Only admins can edit records" });

  const id = parseInt(req.params.id, 10);
  const { guestName, phone, roomAmount, amountPaidAtCheckin, checkInTime, checkOutTime } = req.body as {
    guestName: string; phone: string;
    roomAmount: number; amountPaidAtCheckin: number;
    checkInTime: string; checkOutTime: string;
  };

  if (!guestName?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: "Guest name and phone are required" });
  }

  try {
    const { rows: existing } = await pool.query(
      "SELECT due_amount_paid_at_checkout FROM history WHERE id = $1",
      [id]
    );
    if (existing.length === 0) return res.status(404).json({ error: "Record not found" });

    const roomAmt = Number(roomAmount) || 0;
    const paidAtCheckin = Number(amountPaidAtCheckin) || 0;
    const duePaid = Number(existing[0].due_amount_paid_at_checkout);
    const totalPaid = paidAtCheckin + duePaid;

    const { rows } = await pool.query(
      `UPDATE history SET
        guest_name=$1, phone=$2, room_amount=$3,
        amount_paid_at_checkin=$4, total_paid=$5,
        check_in_time=$6, check_out_time=$7
       WHERE id=$8
       RETURNING *`,
      [guestName.trim(), phone.trim(), roomAmt, paidAtCheckin, totalPaid, checkInTime, checkOutTime, id]
    );

    return res.json(toRecord(rows[0] as HistoryRow));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

router.delete("/history/:id", async (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  if (session.role !== "admin") return res.status(403).json({ error: "Only admins can delete history records" });

  const id = parseInt(req.params.id, 10);

  try {
    const { rows } = await pool.query("SELECT id FROM history WHERE id = $1", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "History record not found" });

    await pool.query("DELETE FROM history WHERE id = $1", [id]);
    return res.json({ success: true, message: "History record deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

export default router;
