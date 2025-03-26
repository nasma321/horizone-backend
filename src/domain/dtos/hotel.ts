import { z } from "zod";

const RoomDTO = z.object({
  roomNumber: z.number().optional(),
  type: z.enum(['Standard', 'Deluxe', 'Suite', 'Presidential']).optional(),
  capacity: z.number().min(1).max(8).optional(),
  price: z.number().positive().optional(),
  amenities: z.array(z.string()).optional(),
  available: z.boolean().optional()
});

export const CreateHotelDTO = z.object({
  name: z.string({
    required_error: "Hotel name is required",
    invalid_type_error: "Hotel name must be a string"
  }).min(1, { message: "Hotel name is required" }),
  
  location: z.string({
    required_error: "Location is required",
    invalid_type_error: "Location must be a string"
  }).min(1, { message: "Location is required" }),
  
  image: z.string({
    required_error: "Image URL is required",
    invalid_type_error: "Image URL must be a string"
  }).min(1, { message: "Image URL is required" }),
  
  price: z.number({
    required_error: "Price is required",
    invalid_type_error: "Price must be a number"
  }).or(z.string().regex(/^\d+$/).transform(Number))
  .refine(n => n > 0, { message: "Price must be greater than 0" }),
  
  description: z.string({
    required_error: "Description is required",
    invalid_type_error: "Description must be a string"
  }).min(1, { message: "Description is required" }),
  
  amenities: z.array(z.string()).optional(),
  
  rooms: z.array(RoomDTO).optional(),
  
  policies: z.object({
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    cancellationPolicy: z.string().optional()
  }).optional()
});

export const UpdateHotelDTO = CreateHotelDTO.partial();