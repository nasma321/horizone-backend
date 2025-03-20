import { z } from "zod";

// DTO => Data Transfer Object

export const CreateHotelDTO = z.object({
  name: z.string(),
  location: z.string(),
  description: z.string(),
  image: z.string(),
  price: z.number(),
  rating: z.number().default(0),
  reviews: z.number().default(0),
  amenities: z.array(z.string()).default([]),
});
