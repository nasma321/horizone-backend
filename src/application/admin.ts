import { NextFunction, Request, Response } from "express";
import Hotel from "../infrastructure/schemas/Hotel";
import Booking from "../infrastructure/schemas/Booking";
import Review from "../infrastructure/schemas/Review";
import { clerkClient } from "@clerk/express";

export const getStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotelsCount = await Hotel.countDocuments();
    
    const bookingsCount = await Booking.countDocuments();
    
    const reviewsCount = await Review.countDocuments();
    
    const { total_count: userCount } = await clerkClient.users.getCount();
    
    res.status(200).json({
      hotels: hotelsCount,
      bookings: bookingsCount,
      users: userCount,
      reviews: reviewsCount,
    });
  } catch (error) {
    next(error);
  }
};