import { NextFunction, Request, Response } from "express";

import Hotel from "../infrastructure/schemas/Hotel";
import NotFoundError from "../domain/errors/not-found-error";
import ValidationError from "../domain/errors/validation-error";
import { CreateHotelDTO } from "../domain/dtos/hotel";

import OpenAI from "openai";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getAllHotels = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { location, sortBy, order } = req.query;
    
    const query: any = {};
    if (location) {
      query.location = { $regex: new RegExp(location as string, 'i') };
    }
    
    const sortOptions: any = {};
    if (sortBy === 'price') {
      sortOptions.price = order === 'desc' ? -1 : 1;
    }
    
    const hotels = await Hotel.find(query).sort(Object.keys(sortOptions).length ? sortOptions : {});
    
    res.status(200).json(hotels);
    return;
  } catch (error) {
    next(error);
  }
};

export const getHotelLocations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const locations = await Hotel.distinct('location');
    res.status(200).json(locations);
    return;
  } catch (error) {
    next(error);
  }
};

export const getHotelById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotelId = req.params.id;
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      throw new NotFoundError("Hotel not found");
    }

    res.status(200).json(hotel);
    return;
  } catch (error) {
    next(error);
  }
};

export const generateResponse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { prompt } = req.body;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: prompt },
    ],
    store: true,
  });

  res.status(200).json({
    message: {
      role: "assistant",
      content: completion.choices[0].message.content,
    },
  });
  return;
};

export const createHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotel = CreateHotelDTO.safeParse(req.body);

    if (!hotel.success) {
      throw new ValidationError(hotel.error.message);
    }

    await Hotel.create({
      name: hotel.data.name,
      location: hotel.data.location,
      image: hotel.data.image,
      price: parseInt(hotel.data.price),
      description: hotel.data.description,
      amenities: hotel.data.amenities || [],   // Save amenities
      policies: hotel.data.policies || {},     // Save policies
      rooms: hotel.data.rooms || []            // Save room information
    });

    res.status(201).send();
    return;
  } catch (error) {
    next(error);
  }
};

export const deleteHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotelId = req.params.id;
    await Hotel.findByIdAndDelete(hotelId);

    res.status(200).send();
    return;
  } catch (error) {
    next(error);
  }
};

export const updateHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotelId = req.params.hotelId;
    const updatedHotel = req.body;

    // Simplified validation to accept additional fields
    if (
      !updatedHotel.name ||
      !updatedHotel.location ||
      !updatedHotel.image ||
      !updatedHotel.price ||
      !updatedHotel.description
    ) {
      throw new ValidationError("Invalid hotel data");
    }

    await Hotel.findByIdAndUpdate(hotelId, updatedHotel);

    res.status(200).send();
    return;
  } catch (error) {
    next(error);
  }
};