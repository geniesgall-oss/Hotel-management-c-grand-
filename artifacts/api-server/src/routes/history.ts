import { Router } from "express";
import db from "../db.js";
import { getSession } from "./auth.js";

const router = Router();

router.get("/history", (_req, res) => {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const cutoff = twoMonthsAgo.toISOString();

  const records = db
    .prepare("SELECT * FROM history WHERE check_out_time >= ? ORDER BY check_out_time DESC")
    .all(cutoff) as {
    id: number; guest_name: string; phone: string; room_number: string;
    check_in_time: string; check_out_time: string; room_amount: number;
    amount_paid_at_checkin: number; payment_method_at_checkin: string;
    due_amount_paid_at_checkout: number; due_payment_method_at_checkout: string; total_paid: number;
  }[];

  return res.json(
    records.map(r => ({
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
    }))
  );
});

router.delete("/history/:id", (req, res) => {
  const authHeader = req.headers.authorization;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;

  if (!session) return res.status(401).json({ error: "Not authenticated" });
  if (session.role !== "admin") return res.status(403).json({ error: "Only admins can delete history records" });

  const id = parseInt(req.params.id, 10);
  const record = db.prepare("SELECT * FROM history WHERE id = ?").get(id);
  if (!record) return res.status(404).json({ error: "History record not found" });

  db.prepare("DELETE FROM history WHERE id = ?").run(id);
  return res.json({ success: true, message: "History record deleted" });
});

export default router;
