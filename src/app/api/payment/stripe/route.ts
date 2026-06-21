// src/app/api/payment/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { PaymentSession } from "@/models/paymentSession.model";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;
const getStripeClient = () => {
  if (stripeClient) return stripeClient;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  stripeClient = new Stripe(stripeSecret);
  return stripeClient;
};

export const POST = async (req: NextRequest) => {
  try {
    const stripe = getStripeClient();
    await connectDb();
    const { paymentSessionId } = await req.json();

    if (!paymentSessionId) {
      return NextResponse.json(
        { message: "Payment session ID is required" },
        { status: 400 }
      );
    }

    const paymentSession = await PaymentSession.findById(paymentSessionId);

    if (!paymentSession) {
      return NextResponse.json(
        { message: "Payment session not found" },
        { status: 404 }
      );
    }

    if (paymentSession.status !== "pending") {
      return NextResponse.json(
        { message: "Payment session already processed" },
        { status: 400 }
      );
    }

    const line_items = [
      {
        price_data: {
          currency: paymentSession.currency.toLowerCase(),
          product_data: {
            name: "Snapcart Order Payment",
            description: `Payment for Order Session #${paymentSession._id.toString().slice(-6)}`,
          },
          unit_amount: Math.round(paymentSession.finalTotal * 100),
        },
        quantity: 1,
      },
    ];

    let sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL}/user/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/user/payment/cancel?paymentSessionId=${paymentSession._id}`,
      metadata: {
        paymentSessionId: paymentSession._id.toString(),
      },
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    paymentSession.providerSessionId = session.id;
    await paymentSession.save();

    return NextResponse.json({ session });
  } catch (error: any) {
    console.error("Stripe session creation error:", error);
    return NextResponse.json(
      { message: `Failed to create Stripe session: ${error.message}` },
      { status: 500 }
    );
  }
};