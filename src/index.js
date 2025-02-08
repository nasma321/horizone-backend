import "dotenv/config";
import express from "express";
import connectDB from "./infrastructure/db.js";

import hotelsRouter from "./api/hotel.js";
import usersRouter from "./api/user.js";
import bookingsRouter from "./api/booking.js";

const app = express();
app.use(express.json());

connectDB();

app.use("/api/hotels", hotelsRouter);
app.use("/api/users", usersRouter);
app.use("/api/bookings", bookingsRouter);

const PORT = 8000;
app.listen(PORT, console.log(`Server is running on port ${PORT}...`));