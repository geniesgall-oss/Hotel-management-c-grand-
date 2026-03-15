import app from "./app";
import { initDb, purgeOldHistory } from "./db.js";
import pool from "./db.js";

const PORT = process.env.PORT || 3000;

/**
 * Auto-billing engine: runs every 60 seconds.
 * For each active booking, checks how many full stay_hours periods have elapsed
 * since check-in. For each new period, posts an "Auto Day Charge" to room_extras
 * and bumps auto_charges_posted so it doesn't double-charge.
 */
async function postAutoCharges(): Promise<void> {
  try {
    const { rows: bookings } = await pool.query(
      `SELECT id, check_in_time, stay_hours, auto_charges_posted, room_amount FROM bookings`
    );

    for (const booking of bookings) {
      const checkIn = new Date(booking.check_in_time);
      const now = new Date();
      const elapsedHours = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      const expectedCharges = Math.floor(elapsedHours / Number(booking.stay_hours));
      const alreadyPosted = Number(booking.auto_charges_posted);

      if (expectedCharges > alreadyPosted) {
        const chargesNeeded = expectedCharges - alreadyPosted;
        for (let i = 0; i < chargesNeeded; i++) {
          const dayNum = alreadyPosted + i + 2; // Day 2, Day 3, etc.
          const label = `Auto Charge – Day ${dayNum}`;
          const now = new Date().toISOString();
          await pool.query(
            `INSERT INTO room_extras (booking_id, item_name, rate, qty, created_at, is_auto_charge)
             VALUES ($1, $2, $3, 1, $4, TRUE)`,
            [booking.id, label, Number(booking.room_amount), now]
          );
        }
        await pool.query(
          "UPDATE bookings SET auto_charges_posted = $1 WHERE id = $2",
          [expectedCharges, booking.id]
        );
        console.log(
          `[auto-charge] Booking ${booking.id}: posted ${chargesNeeded} charge(s) (total posted: ${expectedCharges})`
        );
      }
    }
  } catch (err) {
    console.error("[auto-charge] Error:", err);
  }
}

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);

      // Auto-purge history older than 2 months
      purgeOldHistory();
      setInterval(purgeOldHistory, 24 * 60 * 60 * 1000);

      // Auto-billing: post day charges every 60 seconds
      postAutoCharges();
      setInterval(postAutoCharges, 60 * 1000);
    });
  })
  .catch((err) => {
    console.error("[startup] Failed to initialise database:", err);
    process.exit(1);
  });
