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
            collection: mongoose.connection.collection("hotelVecotrs"),
            indexName: "vector_index"
        });

        const hotels = await Hotel.find();

        const docs = hotels.map((hotel) => {
            const { _id, location, price, description } = hotel;
            const doc = new Document({
                pageContent: `${description} Located in ${location}. Price per night: ${price}`,
                metadata: {
                    _id
                }
            });

            return doc;
        });       

        await vectorIndex.addDocuments(docs);

        res.status(200).json({ message: "Embeddings created successfully" });

    } catch (error) {
        
    }
}