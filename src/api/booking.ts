import express from "express";
import {
  createBooking,
  getAllBookingsForHotel,
  getAllBookings,
  getUserBookings,
  cancelBooking,
} from "./../application/booking";

const bookingsRouter = express.Router();

bookingsRouter.route("/")
  .post(createBooking as express.RequestHandler)
  .get(getAllBookings as express.RequestHandler);

bookingsRouter.route("/hotels/:hotelId")
  .get(getAllBookingsForHotel as express.RequestHandler);

bookingsRouter.route("/user/:userId")
  .get(getUserBookings as express.RequestHandler);

bookingsRouter.route("/:bookingId/cancel")
  .put(cancelBooking as express.RequestHandler);

export default bookingsRouter;