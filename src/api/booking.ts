import express from "express";
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
} from "../application/booking";
import { isAuthenticated } from './middlewares/authentication-middleware';

const bookingsRouter = express.Router();

bookingsRouter.post("/", isAuthenticated, createBooking);
bookingsRouter.get("/user", isAuthenticated, getUserBookings);
bookingsRouter.get("/:id", isAuthenticated, getBookingById);
bookingsRouter.put("/:id/cancel", isAuthenticated, cancelBooking);

export default bookingsRouter;