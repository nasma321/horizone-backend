import { NextFunction, Request, Response } from "express";
import Booking from "../infrastructure/schemas/Booking";
import Hotel from "../infrastructure/schemas/Hotel";
import { CreateBookingDTO } from "../domain/dtos/booking";
import ValidationError from "../domain/errors/validation-error";
import { clerkClient } from "@clerk/express";

export const createBooking = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const bookingValidation = CreateBookingDTO.safeParse(req.body);
    
    if (!bookingValidation.success) {
      throw new ValidationError(bookingValidation.error.message);
    }
    
    const booking = bookingValidation.data;
    
    const userId = req.auth.userId;

    const hotel = await Hotel.findById(booking.hotelId);
    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    const newBooking = await Booking.create({
      hotelId: booking.hotelId,
      userId: userId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      roomNumber: booking.roomNumber,
      totalPrice: booking.totalPrice,
      guestInfo: booking.guestInfo,
      status: "confirmed",
    });

    res.status(201).json(newBooking);
  } catch (error) {
    next(error);
  }
};

export const getAllBookingsForHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotelId = req.params.hotelId;
    const bookings = await Booking.find({ hotelId: hotelId });
    
    const bookingsWithUser = await Promise.all(
      bookings.map(async (booking) => {
        try {
          const user = await clerkClient.users.getUser(booking.userId);
          return {
            _id: booking._id,
            hotelId: booking.hotelId,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            roomNumber: booking.roomNumber,
            totalPrice: booking.totalPrice,
            status: booking.status,
            guestInfo: booking.guestInfo,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.emailAddresses[0]?.emailAddress,
            },
          };
        } catch (error) {
          return {
            _id: booking._id,
            hotelId: booking.hotelId,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            roomNumber: booking.roomNumber,
            totalPrice: booking.totalPrice,
            status: booking.status,
            guestInfo: booking.guestInfo,
          };
        }
      })
    );

    res.status(200).json(bookingsWithUser);
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bookings = await Booking.find().populate("hotelId", "name location image price");

    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

export const getUserBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.params.userId;
    
    if (userId !== req.auth.userId) {
      return res.status(403).json({ message: "Not authorized to view these bookings" });
    }
    
    const bookings = await Booking.find({ userId })
      .populate("hotelId", "name location image price")
      .sort({ createdAt: -1 });

    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      roomNumber: booking.roomNumber,
      totalPrice: booking.totalPrice,
      status: booking.status,
      createdAt: booking.createdAt,
      guestInfo: booking.guestInfo,
      hotel: booking.hotelId
    }));

    res.status(200).json(formattedBookings);
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bookingId = req.params.bookingId;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.userId !== req.auth.userId) {
      return res.status(403).json({ message: "Not authorized to cancel this booking" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking is already cancelled" });
    }

    booking.status = "cancelled";
    await booking.save();

    res.status(200).json({ 
      message: "Booking cancelled successfully",
      booking: {
        _id: booking._id,
        status: booking.status
      }
    });
  } catch (error) {
    next(error);
  }
};