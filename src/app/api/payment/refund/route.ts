// src/app/api/payment/refund/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import Stripe from "stripe";
import Razorpay from "razorpay";

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

let razorpayClient: Razorpay | null = null;
const getRazorpayClient = () => {
  if (razorpayClient) return razorpayClient;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET not configured");
  }
  razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpayClient;
};

export const POST = async (req: NextRequest) => {
  try {
    await connectDb();

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { message: "orderId is required" },
        { status: 400 }
      );
    }

    /* ================= ORDER ================= */
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.paymentMethod !== "online") {
      return NextResponse.json(
        { message: "Refund not applicable for COD orders" },
        { status: 400 }
      );
    }

    if (order.refundStatus && order.refundStatus !== "initiated") {
      return NextResponse.json(
        { message: "Refund already processed or invalid state" },
        { status: 400 }
      );
    }

    /* ================= STRIPE REFUND ================= */
    const latestPayment = Array.isArray(order.paymentDetails)
      ? order.paymentDetails[order.paymentDetails.length - 1]
      : null;

    if (
      order.onlinePaymentType === "stripe" &&
      latestPayment?.transactionId
    ) {
      const stripe = getStripeClient();
      await stripe.refunds.create({
        payment_intent: latestPayment.transactionId,
        amount: Math.round(order.finalTotal * 100), // in paise
      });
    }

    /* ================= RAZORPAY REFUND ================= */
    if (
      order.onlinePaymentType === "razorpay" &&
      latestPayment?.transactionId
    ) {
      const razorpay = getRazorpayClient();
      await razorpay.payments.refund(latestPayment.transactionId, {
        amount: Math.round(order.finalTotal * 100), // in paise
      });
    }

    /* ================= UPDATE ORDER ================= */
    order.refundStatus = "processing";
    order.refundInitiatedAt = new Date();
    await order.save();

    return NextResponse.json(
      { success: true, message: "Refund initiated", order },
      { status: 200 }
    );
  } catch (error) {
    console.error("Refund API Error:", error);
    return NextResponse.json(
      { success: false, message: `Refund error: ${error}` },
      { status: 500 }
    );
  }
};
