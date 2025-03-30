import { z } from "zod"

export const CreateHotelDTO = z.object({
    name: z.string(),
    location: z.string(),
    image: z.string(),
    price: z.string(),
    description: z.string(),
    amenities: z.array(z.string()).optional(),
    rooms: z.array(
      z.object({
        roomNumber: z.number().optional(),
        type: z.enum(['Standard', 'Deluxe', 'Suite', 'Presidential']).optional(),
        capacity: z.number().optional(),
        price: z.number().optional(),
        amenities: z.array(z.string()).optional(),
        available: z.boolean().optional()
      })
    ).optional(),
    policies: z.object({
      checkInTime: z.string().optional(),
      checkOutTime: z.string().optional(),
      cancellationPolicy: z.string().optional()
    }).optional()
});

export const UpdateHotelDTO = CreateHotelDTO.partial();