import { z } from "zod";

export const CreateReviewDTO = z.object({
  hotelId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(3, { message: "Review comment must be at least 3 characters" }),
});

export const UpdateReviewDTO = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(3, { message: "Review comment must be at least 3 characters" }),
});