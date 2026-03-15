import { Router } from "express";
import pool from "../db.js";
import { getSession } from "./auth.js";

const router = Router();

router.get("/reports/monthly", async (req, res) => {
  const authHeader = req.headers.authorization as string | undefined;
  const session = authHeader?.startsWith("Bearer ") ? getSession(authHeader.slice(7)) : null;
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  if (!year || !month || month < 1 || month > 12) {
    return res.status(400).json({ error: "Valid year and month (1-12) are required" });
  }

  const monthStr = String(month).padStart(2, "0");
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}T23:59:59`;

  try {
    const { rows } = await pool.query(
      `SELECT id, guest_name, phone, room_number, check_in_time, check_out_time,
              room_amount, amount_paid_at_checkin, payment_method_at_checkin,
              due_amount_paid_at_checkout, due_payment_method_at_checkout, total_paid
       FROM history
       WHERE check_out_time >= $1 AND check_out_time <= $2
       ORDER BY check_out_time DESC`,
      [startDate, endDate]
    );

    let cashTotal = 0, phonePeTotal = 0, gPayTotal = 0, cardTotal = 0, totalRevenue = 0;

    for (const r of rows) {
      totalRevenue += Number(r.total_paid);
      const ci = Number(r.amount_paid_at_checkin);
      if (r.payment_method_at_checkin === "Cash") cashTotal += ci;
      else if (r.payment_method_at_checkin === "PhonePe") phonePeTotal += ci;
      else if (r.payment_method_at_checkin === "GPay") gPayTotal += ci;
      else if (r.payment_method_at_checkin === "Card") cardTotal += ci;

      const co = Number(r.due_amount_paid_at_checkout);
      if (co > 0) {
        if (r.due_payment_method_at_checkout === "Cash") cashTotal += co;
        else if (r.due_payment_method_at_checkout === "PhonePe") phonePeTotal += co;
        else if (r.due_payment_method_at_checkout === "GPay") gPayTotal += co;
        else if (r.due_payment_method_at_checkout === "Card") cardTotal += co;
      }
    }

    return res.json({
      year,
      month,
      totalBookings: rows.length,
      totalRevenue,
      cashTotal,
      phonePeTotal,
      gPayTotal,
      cardTotal,
      bookings: rows.map(r => ({
        id: r.id,
        guestName: r.guest_name,
        phone: r.phone,
        roomNumber: r.room_number,
        checkInTime: r.check_in_time,
        checkOutTime: r.check_out_time,
        roomAmount: Number(r.room_amount),
        totalPaid: Number(r.total_paid),
        paymentMethodAtCheckin: r.payment_method_at_checkin,
        duePaymentMethodAtCheckout: r.due_payment_method_at_checkout,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

export default router;
