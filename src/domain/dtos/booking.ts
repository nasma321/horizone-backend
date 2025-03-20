import { z } from "zod";

export const GuestInfoDTO = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Valid email is required" }),
  phone: z.string().min(10, { message: "Valid phone number is required" }),
  specialRequests: z.string().optional(),
});

export const CreateBookingDTO = z.object({
  hotelId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  roomNumber: z.number(),
  totalPrice: z.number(),
  guestInfo: GuestInfoDTO.optional(),
});