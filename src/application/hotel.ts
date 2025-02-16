import { Request, Response } from "express";
import Hotel from "../infrastructure/schemas/Hotel";

export const getAllHotels = async (req: Request, res: Response) => {
  const hotels = await Hotel.find();
  res.status(200).json(hotels);
  return;
};

export const getHotelById = async (req: Request, res: Response) => {
  const hotelId = req.params.id;
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    res.status(404).send();
    return;
  }

  res.status(200).json(hotel);
  return;
};

export const createHotel = async (req: Request, res: Response) => {
  const hotel = req.body;

  if (
    !hotel.name ||
    !hotel.location ||
    !hotel.rating ||
    !hotel.reviews ||
    !hotel.image ||
    !hotel.price ||
    !hotel.description
  ) {
    res.status(400).send();
    return;
  }

  await Hotel.create({
    name: hotel.name,
    location: hotel.location,
    rating: parseFloat(hotel.rating),
    reviews: parseInt(hotel.reviews),
    image: hotel.image,
    price: parseInt(hotel.price),
    description: hotel.description,
  });

  res.status(201).send();
  return;
};

export const deleteHotel = async (req: Request, res: Response) => {
  const hotelId = req.params.id;
  await Hotel.findByIdAndDelete(hotelId);

  res.status(200).send();
  return;
};

export const updateHotel = async (req: Request, res: Response) => {
  const hotelId = req.params.hotelId;
  const updatedHotel = req.body;

  if (
    !updatedHotel.name ||
    !updatedHotel.location ||
    !updatedHotel.rating ||
    !updatedHotel.reviews ||
    !updatedHotel.image ||
    !updatedHotel.price ||
    !updatedHotel.description
  ) {
    res.status(400).send();
    return;
  }

  await Hotel.findByIdAndUpdate(hotelId, updatedHotel);

  res.status(200).send();
  return;
};