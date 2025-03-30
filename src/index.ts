import "dotenv/config";
import express from "express";
import connectDB from "./infrastructure/db";

import hotelsRouter from "./api/hotel";
import bookingsRouter from "./api/booking";
import cors from "cors";
import globalErrorHandlingMiddleware from "./api/middlewares/global-error-handling-middleware";
import { clerkMiddleware } from "@clerk/express";

import paymentsRouter from "./api/payment";
import bodyParser from "body-parser";
import { handleWebhook } from "./application/payment";

const app = express();

app.use(clerkMiddleware());

app.post(
    "/api/stripe/webhook",
    bodyParser.raw({ type: "application/json" }),
    handleWebhook
  );

app.use(express.json());
app.use(cors({ origin: "https://aidf-horizone-frontend-nasma.netlify.app" }));


app.use("/api/hotels", hotelsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/payments", paymentsRouter);

app.use(globalErrorHandlingMiddleware);
connectDB();
const PORT = process.env.PORT || 8001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}...`));