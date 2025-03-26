import { z } from "zod";

export const CreateBookingDTO = z.object({
  hotelId: z.string({
    required_error: "Hotel ID is required",
    invalid_type_error: "Hotel ID must be a string"
  }),
  roomNumber: z.number({
    required_error: "Room number is required",
    invalid_type_error: "Room number must be a number"
  }),
  checkIn: z.string({
    required_error: "Check-in date is required",
    invalid_type_error: "Check-in date must be a string"
  }).refine(date => {
    const checkIn = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkIn >= today;
  }, {
    message: "Check-in date must be today or in the future"
  }),
  checkOut: z.string({
    required_error: "Check-out date is required",
    invalid_type_error: "Check-out date must be a string"
  }),
  guests: z.object({
    adults: z.number().min(1).default(1),
    children: z.number().min(0).default(0)
  }).optional(),
  specialRequests: z.string().optional()
}).refine(data => {
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  return checkOut > checkIn;
}, {
  message: "Check-out date must be after check-in date",
  path: ["checkOut"]
});

export const UpdateBookingStatusDTO = z.object({
  status: z.enum(['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'], {
    required_error: "Status is required",
    invalid_type_error: "Invalid status"
  })
});