import express from "express";
import { 
  createReview, 
  getReviewsByHotel, 
  getUserReviews,
  deleteReview,
  updateReview
} from "./../application/reviews";

const reviewsRouter = express.Router();

reviewsRouter.route("/")
  .post(createReview as express.RequestHandler);

reviewsRouter.route("/hotel/:hotelId")
  .get(getReviewsByHotel as express.RequestHandler);

reviewsRouter.route("/user/:userId")
  .get(getUserReviews as express.RequestHandler);

reviewsRouter.route("/:reviewId")
  .put(updateReview as express.RequestHandler)
  .delete(deleteReview as express.RequestHandler);

export default reviewsRouter;