import { Router } from "express";
import db from "../db.js";
import { getSession } from "./auth.js";

const router = Router();

type HistoryRow = {
  id: number; guest_name: string; phone: string; room_number: string;
  check_in_time: string; check_out_time: string; room_amount: number;
  amount_paid_at_checkin: number; payment_method_at_checkin: string;
  due_amount_paid_at_checkout: number; due_payment_method_at_checkout: string;
  total_paid: number; checked_in_by: string; checked_out_by: string;
};

function toRecord(r: HistoryRow) {
  return {
    id: r.id,
    guestName: r.guest_name,
    phone: r.phone,
    roomNumber: r.room_number,
    checkInTime: r.check_in_time,
    checkOutTime: r.check_out_time,
    roomAmount: r.room_amount,
    amountPaidAtCheckin: r.amount_paid_at_checkin,
    paymentMethodAtCheckin: r.payment_method_at_checkin,
    dueAmountPaidAtCheckout: r.due_amount_paid_at_checkout,
    duePaymentMethodAtCheckout: r.due_payment_method_at_checkout,
    totalPaid: r.total_paid,
    checkedInBy: r.checked_in_by || "—",
    checkedOutBy: r.checked_out_by || "—",
  };
}

router.get("/history", (_req, res) => {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const cutoff = twoMonthsAgo.toISOString();
  const records = db
    .prepare("SELECT * FROM history WHERE check_out_time >= ? ORDER BY check_out_time DESC")
    .all(cutoff) as HistoryRow[];
  return res.json(records.map(toRecord));
});

// Admin: edit a history record
router.put("/history/:id", (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  if (session.role !== "admin") return res.status(403).json({ error: "Only admins can edit records" });

  const id = parseInt(req.params.id, 10);
  const existing = db.prepare("SELECT * FROM history WHERE id = ?").get(id) as HistoryRow | undefined;
  if (!existing) return res.status(404).json({ error: "Record not found" });

  const { guestName, phone, roomAmount, amountPaidAtCheckin, checkInTime, checkOutTime } = req.body as {
    guestName: string; phone: string;
    roomAmount: number; amountPaidAtCheckin: number;
    checkInTime: string; checkOutTime: string;
  };

  if (!guestName?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: "Guest name and phone are required" });
  }

  const roomAmt = Number(roomAmount) || 0;
  const paidAtCheckin = Number(amountPaidAtCheckin) || 0;
  const duePaid = existing.due_amount_paid_at_checkout;
  const totalPaid = paidAtCheckin + duePaid;

  db.prepare(`
    UPDATE history SET
      guest_name=?, phone=?, room_amount=?,
      amount_paid_at_checkin=?, total_paid=?,
      check_in_time=?, check_out_time=?
    WHERE id=?
  `).run(
    guestName.trim(), phone.trim(), roomAmt,
    paidAtCheckin, totalPaid,
    checkInTime, checkOutTime, id
  );

  const updated = db.prepare("SELECT * FROM history WHERE id = ?").get(id) as HistoryRow;
  return res.json(toRecord(updated));
});

// Admin: delete a history record
router.delete("/history/:id", (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  if (session.role !== "admin") return res.status(403).json({ error: "Only admins can delete history records" });

  const id = parseInt(req.params.id, 10);
  const record = db.prepare("SELECT id FROM history WHERE id = ?").get(id);
  if (!record) return res.status(404).json({ error: "History record not found" });

  db.prepare("DELETE FROM history WHERE id = ?").run(id);
  return res.json({ success: true, message: "History record deleted" });
});

export default router;
