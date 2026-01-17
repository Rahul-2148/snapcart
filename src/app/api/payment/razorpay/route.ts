// src/app/api/payment/razorpay/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { decrementStock } from "@/lib/utils/decrementStock";
import mongoose from "mongoose";
import Razorpay from "razorpay";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("Razorpay key/secret not set");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const POST = async (req: NextRequest) => {
  const signature = req.headers.get("x-razorpay-signature");

  // If signature exists, it's a webhook from Razorpay
  if (signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const body = await req.text();

    try {
      razorpay.webhooks.validateWebhookSignature(body, signature, secret);
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);

    if (event.event !== "payment.captured") {
      return NextResponse.json({ status: "ok" });
    }

    const payment = event.payload.payment.entity;
    const orderId = payment.notes?.orderId;

    if (!orderId) {
      return NextResponse.json(
        { message: "Order ID not found in webhook payload" },
        { status: 400 }
      );
    }

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      await connectDb();
      const order = await Order.findById(orderId).session(dbSession);

      if (!order) {
        return NextResponse.json(
          { message: "Order not found" },
          { status: 404 }
        );
      }

      if (order.orderStatus === "confirmed") {
        await dbSession.commitTransaction();
        return NextResponse.json(
          { message: "Order already processed." },
          { status: 200 }
        );
      }

      order.paymentStatus = "paid";
      order.paymentDetails = {
        provider: "razorpay",
        transactionId: payment.id,
        paymentMethod: payment.method,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
      };
      order.orderStatus = "confirmed";
      order.confirmedAt = new Date();

      await decrementStock(order._id, dbSession);
      await order.save({ session: dbSession });
      await dbSession.commitTransaction();

      return NextResponse.json({ status: "success" }, { status: 200 });
    } catch (error: any) {
      if (dbSession.inTransaction()) {
        await dbSession.abortTransaction();
      }
      console.error("Webhook processing error:", error);
      return NextResponse.json(
        { message: `Webhook error: ${error.message}` },
        { status: 500 }
      );
    } finally {
      dbSession.endSession();
    }
  } else {
    // It's a request from our frontend to create a Razorpay order
    try {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay key/secret not set");
    }
      await connectDb();
      const { orderId } = await req.json();

      if (!orderId) {
        return NextResponse.json(
          { message: "Order ID is required" },
          { status: 400 }
        );
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return NextResponse.json(
          { message: "Order not found" },
          { status: 404 }
        );
      }

      const options = {
        amount: order.finalTotal * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: order.orderNumber,
        notes: {
          orderId: order._id.toString(),
        },
      };

      const razorpayOrder = await razorpay.orders.create(options);

      return NextResponse.json(razorpayOrder);
    } catch (error: any) {
      console.error("Razorpay order creation error:", error);
      return NextResponse.json(
        { message: `Failed to create Razorpay order: ${error.message}` },
        { status: 500 }
      );
    }
  }
};
