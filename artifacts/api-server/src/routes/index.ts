import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import roomsRouter from "./rooms.js";
import bookingsRouter from "./bookings.js";
import historyRouter from "./history.js";
import usersRouter from "./users.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(roomsRouter);
router.use(bookingsRouter);
router.use(historyRouter);
router.use(usersRouter);

export default router;
