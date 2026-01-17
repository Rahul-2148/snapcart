// src/app/api/payment/refund/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import Stripe from "stripe";
import Razorpay from "razorpay";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

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
    if (
      order.onlinePaymentType === "stripe" &&
      order.paymentDetails?.transactionId
    ) {
      await stripe.refunds.create({
        payment_intent: order.paymentDetails.transactionId,
        amount: Math.round(order.finalTotal * 100), // in paise
      });
    }

    /* ================= RAZORPAY REFUND ================= */
    if (
      order.onlinePaymentType === "razorpay" &&
      order.paymentDetails?.transactionId
    ) {
      await razorpay.payments.refund(order.paymentDetails.transactionId, {
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
