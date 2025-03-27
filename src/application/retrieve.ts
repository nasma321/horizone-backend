import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { Request, Response, NextFunction } from "express";
import Hotel from "../infrastructure/schemas/Hotel";
import { OpenAIEmbeddings } from "@langchain/openai";
import mongoose from "mongoose";

export const retrieve = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { query } = req.query;
        if(!query || query === "") {
            const hotels = (await Hotel.find()).map((hotel) => ({
                hotel: hotel,
                confidence: 1,
            }));

            res.status(200).json(hotels);
            return;
        }

        const queryString = query as string;
        
        const locationMatch = queryString.match(/in\s+([A-Za-z\s,]+)/) || 
                             queryString.match(/at\s+([A-Za-z\s,]+)/);
        const budgetMatch = queryString.match(/(\$\d+|\d+\s+dollars)/);
        
        let filteredHotels = await Hotel.find();
        
        if (locationMatch && locationMatch[1]) {
            const location = locationMatch[1].trim();
            filteredHotels = filteredHotels.filter(hotel => 
                hotel.location.toLowerCase().includes(location.toLowerCase())
            );
        }
        
        if (budgetMatch && budgetMatch[1]) {
            const budget = parseInt(budgetMatch[1].replace('$', '').replace('dollars', '').trim());
            filteredHotels = filteredHotels.filter(hotel => 
                hotel.price <= budget || 
                hotel.rooms.some(room => room.price <= budget)
            );
        }
        
        if ((locationMatch || budgetMatch) && filteredHotels.length > 0) {
            const embeddingsModel = new OpenAIEmbeddings({
                model: "text-embedding-ada-002",
                apiKey: process.env.OPENAI_API_KEY,
            });
            
            const vectorIndex = new MongoDBAtlasVectorSearch(embeddingsModel, {
                collection: mongoose.connection.collection("hotelVectors"),
                indexName: "vector_index",
            });
            
            let preferenceQuery = queryString
                .replace(/in\s+([A-Za-z\s,]+)/g, '')
                .replace(/at\s+([A-Za-z\s,]+)/g, '')
                .replace(/(\$\d+|\d+\s+dollars)/g, '')
                .trim();
                
            if (!preferenceQuery) {
                const result = filteredHotels.map(hotel => ({
                    hotel: hotel,
                    confidence: 1.0
                }));
                res.status(200).json(result);
                return;
            }
            
            const queryEmbedding = await embeddingsModel.embedQuery(preferenceQuery);
            
            const hotelDocs = await Promise.all(filteredHotels.map(async (hotel) => {
                const hotelEmbedding = await embeddingsModel.embedQuery(`
                    Hotel Name: ${hotel.name}
                    Location: ${hotel.location}
                    Price: ${hotel.price}
                    Amenities: ${hotel.amenities.join(', ')}
                    Description: ${hotel.description}
                `);
                
                const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * hotelEmbedding[i], 0);
                const queryMagnitude = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
                const hotelMagnitude = Math.sqrt(hotelEmbedding.reduce((sum, val) => sum + val * val, 0));
                const similarity = dotProduct / (queryMagnitude * hotelMagnitude);
                
                return {
                    hotel,
                    confidence: similarity
                };
            }));
            
            const result = hotelDocs.sort((a, b) => b.confidence - a.confidence);
            res.status(200).json(result.slice(0, 3));
            return;
        }
        
        const embeddingsModel = new OpenAIEmbeddings({
            model: "text-embedding-ada-002",
            apiKey: process.env.OPENAI_API_KEY,
        });
       
        const vectorIndex = new MongoDBAtlasVectorSearch(embeddingsModel, {
            collection: mongoose.connection.collection("hotelVectors"),
            indexName: "vector_index",
        });

        const results = await vectorIndex.similaritySearchWithScore(queryString);

        const matchedHotels = await Promise.all(
            results.map(async (result) => {
                const hotel = await Hotel.findById(result[0].metadata._id);
                return {
                    hotel: hotel,
                    confidence: result[1],
                };
            })
        );

        const validHotels = matchedHotels.filter(item => item.hotel !== null);
        
        res.status(200).json(validHotels.length > 3 ? validHotels.slice(0, 3) : validHotels);
        
    } catch (error) {
        next(error);
    }
}