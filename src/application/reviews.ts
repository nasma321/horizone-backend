import { NextFunction, Request, Response } from "express";
import Review from "../infrastructure/schemas/Review";
import Hotel from "../infrastructure/schemas/Hotel";
import { CreateReviewDTO, UpdateReviewDTO } from "../domain/dtos/review";
import ValidationError from "../domain/errors/validation-error";
import { clerkClient } from "@clerk/express";

export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const reviewValidation = CreateReviewDTO.safeParse(req.body);
    
    if (!reviewValidation.success) {
      throw new ValidationError(reviewValidation.error.message);
    }
    
    const reviewData = reviewValidation.data;
    const userId = req.auth.userId;
    
    const existingReview = await Review.findOne({ 
      hotelId: reviewData.hotelId, 
      userId 
    });
    
    if (existingReview) {
      return res.status(400).json({ 
        message: "You have already reviewed this hotel" 
      });
    }
    
    const newReview = await Review.create({
      hotelId: reviewData.hotelId,
      userId,
      rating: reviewData.rating,
      comment: reviewData.comment
    });
    
    await updateHotelRating(reviewData.hotelId);
    
    res.status(201).json(newReview);
  } catch (error) {
    next(error);
  }
};

export const getReviewsByHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotelId = req.params.hotelId;
    const reviews = await Review.find({ hotelId }).sort({ createdAt: -1 });
    
    const reviewsWithUser = await Promise.all(
      reviews.map(async (review) => {
        try {
          const user = await clerkClient.users.getUser(review.userId);
          return {
            _id: review._id,
            hotelId: review.hotelId,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              imageUrl: user.imageUrl
            }
          };
        } catch (error) {
          return {
            _id: review._id,
            hotelId: review.hotelId,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt
          };
        }
      })
    );
    
    res.status(200).json(reviewsWithUser);
  } catch (error) {
    next(error);
  }
};

export const getUserReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.params.userId;
    
    if (userId !== req.auth.userId) {
      return res.status(403).json({ message: "Not authorized to view these reviews" });
    }
    
    const reviews = await Review.find({ userId })
      .populate("hotelId", "name location image")
      .sort({ createdAt: -1 });
    
    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const reviewId = req.params.reviewId;
    const updateValidation = UpdateReviewDTO.safeParse(req.body);
    
    if (!updateValidation.success) {
      throw new ValidationError(updateValidation.error.message);
    }
    
    const updateData = updateValidation.data;
    const userId = req.auth.userId;
    
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    
    if (review.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to update this review" });
    }
    
    review.rating = updateData.rating;
    review.comment = updateData.comment;
    await review.save();
    
    await updateHotelRating(review.hotelId.toString());
    
    res.status(200).json(review);
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const reviewId = req.params.reviewId;
    const userId = req.auth.userId;
    
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    
    if (review.userId !== userId && req.auth.sessionClaims.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this review" });
    }
    
    const hotelId = review.hotelId;
    
    await Review.findByIdAndDelete(reviewId);
    
    await updateHotelRating(hotelId.toString());
    
    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    next(error);
  }
};

async function updateHotelRating(hotelId: string) {
  try {
    const reviews = await Review.find({ hotelId });
    
    if (reviews.length === 0) {
      await Hotel.findByIdAndUpdate(hotelId, { 
        rating: 0,
        reviews: 0
      });
      return;
    }
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = parseFloat((totalRating / reviews.length).toFixed(1));
    
    await Hotel.findByIdAndUpdate(hotelId, { 
      rating: averageRating,
      reviews: reviews.length
    });
  } catch (error) {
    console.error("Error updating hotel rating:", error);
  }
}