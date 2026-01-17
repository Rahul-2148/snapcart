// src/app/api/payment/stripe-verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import Stripe from "stripe";
import { decrementStock } from "@/lib/utils/decrementStock";
import mongoose from "mongoose";

import { Coupon } from "@/models/coupon.model";
import { CouponUsage } from "@/models/couponUsage.model";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = async (req: NextRequest) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return NextResponse.json(
        { message: "Session ID is required" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId as string, {
      expand: ["payment_intent"],
    });

    if (!session || !session.metadata?.orderId) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return NextResponse.json(
        { message: "Invalid session or order ID missing" },
        { status: 400 }
      );
    }

    const orderId = session.metadata.orderId;

    await connectDb();
    const order = await Order.findById(orderId).session(dbSession);

    if (!order) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // Idempotency check: If order is already paid, do nothing.
    if (order.paymentStatus === "paid") {
      await dbSession.commitTransaction();
      dbSession.endSession();
      return NextResponse.json(
        { success: true, message: "Payment already processed." },
        { status: 200 }
      );
    }

    if (session.payment_status === "paid") {
      order.paymentStatus = "paid";
      order.orderStatus = "confirmed";
      order.confirmedAt = new Date();
      
      const paymentIntent = session.payment_intent as Stripe.PaymentIntent;

      order.paymentDetails.push({
        provider: "stripe",
        transactionId: paymentIntent.id,
        paymentMethod: session.payment_method_types?.[0] ?? "card",
        amount: session.amount_total! / 100,
        currency: session.currency!,
        status: "succeeded",
        paidAt: new Date(),
      });

      await decrementStock(order._id, dbSession);

      // Create coupon usage if coupon was applied
      if (order.coupon?.couponId) {
        await CouponUsage.create(
          [
            {
              coupon: order.coupon.couponId,
              user: order.userId,
              order: order._id,
              discountAmount: order.couponDiscount || 0,
            },
          ],
          { session: dbSession }
        );
        // Increment usage count
        await Coupon.findByIdAndUpdate(
          order.coupon.couponId,
          { $inc: { usageCount: 1 } },
          { session: dbSession }
        );
      }

      await order.save({ session: dbSession });

      await dbSession.commitTransaction();
      dbSession.endSession();

      return NextResponse.json({
        success: true,
        message: "Payment verified and order updated.",
        order,
      });
    } else {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return NextResponse.json(
        { success: false, message: "Payment not successful" },
        { status: 400 }
      );
    }
  } catch (error) {
    if (dbSession.inTransaction()) {
      await dbSession.abortTransaction();
    }
    dbSession.endSession();

    console.error("Stripe Verification Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: `Stripe verification error: ${errorMessage}` },
      { status: 500 }
    );
  }
};
