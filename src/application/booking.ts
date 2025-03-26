import { NextFunction, Request, Response } from "express";
import Booking from "../infrastructure/schemas/Booking";
import Hotel from "../infrastructure/schemas/Hotel";
import { CreateBookingDTO, UpdateBookingStatusDTO } from "../domain/dtos/booking";
import ValidationError from "../domain/errors/validation-error";
import NotFoundError from "../domain/errors/not-found-error";
import UnauthorizedError from "../domain/errors/unauthorized-error";
import mongoose from "mongoose";

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const booking = CreateBookingDTO.safeParse(req.body);
    
    if (!booking.success) {
      throw new ValidationError(booking.error.message);
    }

    const user = req.auth;
    if (!user || !user.userId) {
      throw new UnauthorizedError("User must be authenticated to create a booking");
    }

    const hotel = await Hotel.findById(booking.data.hotelId);
    if (!hotel) {
      throw new NotFoundError("Hotel not found");
    }

    // Find an available room of the requested type
    const roomType = booking.data.roomType || 'Standard';
    const availableRoom = hotel.rooms.find(r => r.type === roomType && r.available);
    
    if (!availableRoom) {
      throw new ValidationError(`No ${roomType} rooms available for the selected dates`);
    }

    const checkIn = new Date(booking.data.checkIn);
    const checkOut = new Date(booking.data.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24));
    
    if (nights <= 0) {
      throw new ValidationError("Check-out date must be after check-in date");
    }

    const totalPrice = availableRoom.price * nights;

    const newBooking = await Booking.create({
      hotelId: booking.data.hotelId,
      userId: user.userId,
      roomId: availableRoom._id,
      roomNumber: availableRoom.roomNumber,
      roomType: availableRoom.type,
      checkIn: booking.data.checkIn,
      checkOut: booking.data.checkOut,
      guests: booking.data.guests || { adults: 1, children: 0 },
      totalPrice: totalPrice,
      specialRequests: booking.data.specialRequests || "",
      status: 'confirmed',
      paymentStatus: 'pending'
    });

    // Mark the room as unavailable
    availableRoom.available = false;
    await hotel.save();

    res.status(201).json({
      message: "Booking created successfully",
      bookingId: newBooking._id,
      totalPrice
    });
    
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
    const userId = req.auth.userId;
    
    if (!userId) {
      throw new UnauthorizedError("User must be authenticated to view bookings");
    }

    const bookings = await Booking.find({ userId }).sort({ createdAt: -1 });

    const bookingsWithDetails = await Promise.all(bookings.map(async (booking) => {
      const hotel = await Hotel.findById(booking.hotelId);
      return {
        _id: booking._id,
        hotelId: booking.hotelId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        roomNumber: booking.roomNumber,
        roomType: booking.roomType,
        totalPrice: booking.totalPrice,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        createdAt: booking.createdAt,
        hotel: hotel ? {
          name: hotel.name,
          location: hotel.location,
          image: hotel.image
        } : null
      };
    }));

    res.status(200).json(bookingsWithDetails);
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bookingId = req.params.id;
    const userId = req.auth.userId;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw new ValidationError("Invalid booking ID");
    }

    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (booking.userId !== userId) {
      throw new UnauthorizedError("Not authorized to view this booking");
    }

    const hotel = await Hotel.findById(booking.hotelId);

    res.status(200).json({
      ...booking.toObject(),
      hotel: hotel ? {
        name: hotel.name,
        location: hotel.location,
        image: hotel.image,
        policies: hotel.policies
      } : null
    });
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
    const bookingId = req.params.id;
    const userId = req.auth.userId;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw new ValidationError("Invalid booking ID");
    }

    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (booking.userId !== userId) {
      throw new UnauthorizedError("Not authorized to cancel this booking");
    }

    if (booking.status === 'cancelled') {
      throw new ValidationError("Booking is already cancelled");
    }

    if (['checked-in', 'checked-out'].includes(booking.status)) {
      throw new ValidationError(`Cannot cancel a booking that is already ${booking.status}`);
    }

    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();

    // Make the room available again
    const hotel = await Hotel.findById(booking.hotelId);
    if (hotel) {
      const room = hotel.rooms.find(r => r.roomNumber === booking.roomNumber);
      if (room) {
        room.available = true;
        await hotel.save();
      }
    }

    res.status(200).json({
      message: "Booking cancelled successfully"
    });
  } catch (error) {
    next(error);
  }
};