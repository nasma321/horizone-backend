import express from "express";
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getAllBookingsForHotel,
  getAllBookings,
} from "../application/booking";
import { isAuthenticated } from './middlewares/authentication-middleware';
import { isAdmin } from './middlewares/authorization-middleware';

const bookingsRouter = express.Router();

bookingsRouter.post("/", isAuthenticated, createBooking);
bookingsRouter.get("/user", isAuthenticated, getUserBookings);
bookingsRouter.get("/:id", isAuthenticated, getBookingById);
bookingsRouter.put("/:id/cancel", isAuthenticated, cancelBooking);

bookingsRouter.get("/admin/all", isAuthenticated, isAdmin, getAllBookings);
bookingsRouter.get("/admin/hotel/:hotelId", isAuthenticated, isAdmin, getAllBookingsForHotel);

export default bookingsRouter;