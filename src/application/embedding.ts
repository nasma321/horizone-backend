import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Document } from "@langchain/core/documents";
import Hotel from "../infrastructure/schemas/Hotel";

export const CreateEmbeddings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log("Starting embedding creation process...");
        
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not set in environment variables");
        }
        
        if (mongoose.connection.readyState !== 1) {
            throw new Error("MongoDB connection is not established");
        }
        
        const embeddingsModel = new OpenAIEmbeddings({
            apiKey: process.env.OPENAI_API_KEY,
            model: "text-embedding-ada-002",
        });

        const vectorCollection = mongoose.connection.collection("hotelVecotrs");
        console.log(`Using collection: ${vectorCollection.collectionName}`);
        
        const vectorIndex = new MongoDBAtlasVectorSearch(embeddingsModel, {
            collection: vectorCollection,
            indexName: "vector_index"
        });

        const hotels = await Hotel.find();
        console.log(`Found ${hotels.length} hotels to embed`);

        if (hotels.length === 0) {
            throw new Error("No hotels found to embed");
        }

        const docs = hotels.map((hotel) => {
            const { _id, location, price, description, amenities, name, rating } = hotel;
            
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

        try {
            await vectorCollection.deleteMany({});
            console.log("Cleared existing vector embeddings");
        } catch (err) {
            console.warn("Warning: Could not clear existing embeddings", err);
        }

        console.log(`Adding ${docs.length} documents to vector store...`);
        await vectorIndex.addDocuments(docs);
        console.log("Embeddings created successfully");

        res.status(200).json({ 
            message: "Embeddings created successfully",
            count: docs.length
        });

    } catch (error) {
        console.error("Error creating embeddings:", error);
        next(error);
    }
};