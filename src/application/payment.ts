import { Request, Response } from "express";
import Booking from "../infrastructure/schemas/Booking";
import stripe from "../infrastructure/stripe";
import Hotel from "../infrastructure/schemas/Hotel";

const FRONTEND_URL = process.env.FRONTEND_URL as string;

async function fulfillCheckout(sessionId: string) {
  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    const booking = await Booking.findById(checkoutSession.metadata?.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.paymentStatus !== "pending") {
      console.log("Payment already processed");
      return;
    }

    if (checkoutSession.payment_status === "paid") {
      await Booking.findByIdAndUpdate(booking._id, {
        paymentStatus: "paid",
      });
      console.log(`Payment completed for booking ${booking._id}`);
    }
  } catch (error) {
    console.error("Error fulfilling checkout:", error);
  }
}

export const handleWebhook = async (req: Request, res: Response) => {
  const payload = req.body;
  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await fulfillCheckout(event.data.object.id);
      res.status(200).send();
      return;
    }
  } catch (err) {
    const error = err as Error;
    res.status(400).send(`Webhook Error: ${error.message}`);
    return;
  }

  res.status(200).send();
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const bookingId = req.body.bookingId;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    const hotel = await Hotel.findById(booking.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }

    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const numberOfNights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    let lineItems;
    let unitAmount = Math.round(hotel.price * 100); // Price in cents

    // If hotel has a Stripe price ID, use it
    if (hotel.stripePriceId) {
      lineItems = [{
        price: hotel.stripePriceId,
        quantity: numberOfNights,
      }];
    } else {
      lineItems = [{
        quantity: numberOfNights,
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: {
            name: `${hotel.name} - ${booking.roomType || 'Standard'} Room`,
            description: `${numberOfNights} night stay from ${checkIn.toLocaleDateString()} to ${checkOut.toLocaleDateString()}`,
            images: [hotel.image],
          },
        },
      }];
    }

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      line_items: lineItems,
      mode: "payment",
      return_url: `${FRONTEND_URL}/booking/complete?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        bookingId: bookingId,
      },
    });

    res.send({ clientSecret: session.client_secret });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ 
      message: "Failed to create checkout session", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

export const retrieveSessionStatus = async (req: Request, res: Response) => {
  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(
      req.query.session_id as string
    );

    const booking = await Booking.findById(checkoutSession.metadata?.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }
    
    const hotel = await Hotel.findById(booking.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }

    res.status(200).json({
      bookingId: booking._id,
      booking: booking,
      hotel: hotel,
      status: checkoutSession.status,
      customer_email: checkoutSession.customer_details?.email,
      paymentStatus: booking.paymentStatus,
    });
  } catch (error) {
    console.error("Error retrieving session:", error);
    res.status(500).json({ 
      message: "Failed to retrieve session status", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};