import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { Request, Response, NextFunction } from "express";
import Hotel from "../infrastructure/schemas/Hotel";
import { OpenAIEmbeddings } from "@langchain/openai";
import mongoose from "mongoose";

export const retrieve = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log("Starting hotel retrieval process...");
        const { query } = req.query;
        
        if(!query || query === "") {
            console.log("No query provided, returning all hotels");
            const hotels = (await Hotel.find()).map((hotel) => ({
                hotel: hotel,
                confidence: 1,
            }));

            res.status(200).json(hotels);
            return;
        }

        const queryString = query as string;
        console.log(`Processing query: "${queryString}"`);
        
        const locationMatch = queryString.match(/in\s+([A-Za-z\s,]+)/) || 
                             queryString.match(/at\s+([A-Za-z\s,]+)/);
        const budgetMatch = queryString.match(/(\$\d+|\d+\s+dollars)/);
        
        let filteredHotels = await Hotel.find();
        console.log(`Found ${filteredHotels.length} hotels in database`);
        
        if (locationMatch && locationMatch[1]) {
            const location = locationMatch[1].trim();
            console.log(`Filtering by location: "${location}"`);
            filteredHotels = filteredHotels.filter(hotel => 
                hotel.location.toLowerCase().includes(location.toLowerCase())
            );
            console.log(`${filteredHotels.length} hotels match the location criteria`);
        }
        
        if (budgetMatch && budgetMatch[1]) {
            const budget = parseInt(budgetMatch[1].replace('$', '').replace('dollars', '').trim());
            console.log(`Filtering by budget: $${budget}`);
            filteredHotels = filteredHotels.filter(hotel => 
                hotel.price <= budget || 
                hotel.rooms.some(room => room.price <= budget)
            );
            console.log(`${filteredHotels.length} hotels match the budget criteria`);
        }
        
        if ((locationMatch || budgetMatch) && filteredHotels.length > 0) {
            console.log("Using filtered subset for preference matching");
            
            if (!process.env.OPENAI_API_KEY) {
                throw new Error("OPENAI_API_KEY is not set in environment variables");
            }
            
            const embeddingsModel = new OpenAIEmbeddings({
                model: "text-embedding-ada-002",
                apiKey: process.env.OPENAI_API_KEY,
            });
            
            let preferenceQuery = queryString
                .replace(/in\s+([A-Za-z\s,]+)/g, '')
                .replace(/at\s+([A-Za-z\s,]+)/g, '')
                .replace(/(\$\d+|\d+\s+dollars)/g, '')
                .trim();
            
            if (!preferenceQuery) {
                console.log("No preference query remains after filtering, returning filtered hotels");
                const result = filteredHotels.map(hotel => ({
                    hotel: hotel,
                    confidence: 1.0
                }));
                res.status(200).json(result);
                return;
            }
            
            console.log(`Calculating similarity for preference query: "${preferenceQuery}"`);
            
            console.log("Generating embedding for query");
            const queryEmbedding = await embeddingsModel.embedQuery(preferenceQuery);
            console.log(`Generated query embedding with length: ${queryEmbedding.length}`);
            
            console.log("Calculating similarity scores for each hotel");
            const hotelDocs = await Promise.all(filteredHotels.map(async (hotel) => {
                const hotelText = `
                    Hotel Name: ${hotel.name}
                    Location: ${hotel.location}
                    Price: ${hotel.price}
                    Amenities: ${hotel.amenities.join(', ')}
                    Description: ${hotel.description}
                `;
                
                const hotelEmbedding = await embeddingsModel.embedQuery(hotelText);
                
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
            console.log(`Returning top ${Math.min(3, result.length)} results by similarity`);
            res.status(200).json(result.slice(0, 3));
            return;
        }
        
        console.log("Using vector search on all hotels");
        
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not set in environment variables");
        }
        
        const embeddingsModel = new OpenAIEmbeddings({
            model: "text-embedding-ada-002",
            apiKey: process.env.OPENAI_API_KEY,
        });
       
        const vectorCollection = mongoose.connection.collection("hotelVecotrs");
        console.log(`Using vector collection: ${vectorCollection.collectionName}`);
        
        if (!mongoose.connection.db) {
            throw new Error("Database connection is not established.");
        }
        const collections = await mongoose.connection.db.listCollections({ name: "hotelVecotrs" }).toArray();
        if (collections.length === 0) {
            throw new Error("Vector collection 'hotelVecotrs' does not exist. Please create embeddings first.");
        }
        
        const vectorIndex = new MongoDBAtlasVectorSearch(embeddingsModel, {
            collection: vectorCollection,
            indexName: "vector_index",
        });

        console.log("Performing vector similarity search");
        const results = await vectorIndex.similaritySearchWithScore(queryString);
        console.log(`Vector search returned ${results.length} results`);

        if (results.length === 0) {
            console.log("No results from vector search");
            res.status(200).json([]);
            return;
        }

        console.log("Looking up hotels for vector search results");
        const matchedHotels = await Promise.all(
            results.map(async (result) => {
                try {
                    const hotel = await Hotel.findById(result[0].metadata._id);
                    return {
                        hotel: hotel,
                        confidence: result[1],
                    };
                } catch (err) {
                    console.warn(`Could not find hotel with ID ${result[0].metadata._id}`, err);
                    return { hotel: null, confidence: 0 };
                }
            })
        );

        const validHotels = matchedHotels.filter(item => item.hotel !== null);
        console.log(`Found ${validHotels.length} valid hotels from vector search`);
        
        res.status(200).json(validHotels.length > 3 ? validHotels.slice(0, 3) : validHotels);
        
    } catch (error) {
        console.error("Error in hotel retrieval:", error);
        next(error);
    }
};