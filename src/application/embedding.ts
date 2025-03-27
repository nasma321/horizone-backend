import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Document } from "@langchain/core/documents";
import Hotel from "../infrastructure/schemas/Hotel";

export const CreateEmbeddings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const embeddingsModel = new OpenAIEmbeddings({
            apiKey: process.env.OPENAI_API_KEY,
            model: "text-embedding-ada-002",
        });

        const vectorIndex = new MongoDBAtlasVectorSearch(embeddingsModel, {
            collection: mongoose.connection.collection("hotelVectors"),
            indexName: "vector_index"
        });

        const hotels = await Hotel.find();

        const docs = hotels.map((hotel) => {
            const { _id, location, price, description, amenities, name, rating } = hotel;
            
            // Create a comprehensive text representation of the hotel
            const roomTypes = [...new Set(hotel.rooms.map(room => room.type))];
            const roomPrices = hotel.rooms.map(room => room.price);
            const minRoomPrice = Math.min(...roomPrices);
            const maxRoomPrice = Math.max(...roomPrices);
            
            const pageContent = `
                Hotel Name: ${name}
                Location: ${location}
                Base Price: ${price} per night
                Room Price Range: ${minRoomPrice} to ${maxRoomPrice} per night
                Rating: ${rating || 'Not rated'} stars
                Room Types Available: ${roomTypes.join(', ')}
                Amenities: ${amenities.join(', ')}
                Description: ${description}
            `;
            
            const doc = new Document({
                pageContent: pageContent.trim(),
                metadata: {
                    _id,
                    location,
                    price,
                    amenities
                }
            });

            return doc;
        });       

        await vectorIndex.addDocuments(docs);

        res.status(200).json({ message: "Embeddings created successfully" });

    } catch (error) {
        next(error);
    }
}