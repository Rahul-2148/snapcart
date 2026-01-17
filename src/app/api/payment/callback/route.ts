import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { CouponUsage } from "@/models/couponUsage.model";
import { Coupon } from "@/models/coupon.model";
import Stripe from "stripe";
import { decrementStock } from "@/lib/utils/decrementStock";
import mongoose from "mongoose";
import crypto from "crypto";
import Razorpay from "razorpay";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const POST = async (req: NextRequest) => {
  const stripeSignature = req.headers.get("stripe-signature");

  /**
   * ======================================================
   * STRIPE WEBHOOK HANDLER
   * ======================================================
   */
  if (stripeSignature) {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const body = await req.text();

      const event = stripe.webhooks.constructEvent(
        body,
        stripeSignature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      if (event.type === "checkout.session.completed") {
        await connectDb();

        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (!orderId) {
          throw new Error("Order ID missing in Stripe metadata");
        }

        const order = await Order.findById(orderId).session(dbSession);
        if (!order) {
          throw new Error("Order not found");
        }

        if (order.paymentStatus === "paid") {
          await dbSession.commitTransaction();
          dbSession.endSession();
          return NextResponse.json({
            success: true,
            message: "Already processed",
          });
        }

        order.paymentStatus = "paid";
        order.orderStatus = "confirmed";
        order.onlinePaymentType = "stripe";
        order.confirmedAt = new Date();

        order.paymentDetails.push({
          provider: "stripe",
          transactionId: session.payment_intent as string,
          paymentMethod: session.payment_method_types?.[0] ?? "card",
          amount: session.amount_total! / 100,
          currency: session.currency!,
          status: "succeeded",
          paidAt: new Date(),
        });

        await decrementStock(order._id, dbSession);
        await order.save({ session: dbSession });

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

          await Coupon.findByIdAndUpdate(
            order.coupon.couponId,
            { $inc: { usageCount: 1 } },
            { session: dbSession }
          );
        }
      }

      await dbSession.commitTransaction();
      dbSession.endSession();

      return NextResponse.json({ success: true, received: true });
    } catch (error) {
      if (dbSession.inTransaction()) {
        await dbSession.abortTransaction();
      }
      dbSession.endSession();

      console.error("Stripe Webhook Error:", error);
      return NextResponse.json(
        { success: false, message: "Stripe webhook failed" },
        { status: 400 }
      );
    }
  }

  /**
   * ======================================================
   * RAZORPAY FRONTEND CALLBACK HANDLER
   * ======================================================
   */
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    await connectDb();

    const body = await req.json();
    const {
      orderId,
      paymentStatus,
      gateway,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (!orderId || !paymentStatus || !gateway) {
      throw new Error("Missing required fields");
    }

    const order = await Order.findById(orderId).session(dbSession);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.paymentStatus === "paid") {
      await dbSession.commitTransaction();
      dbSession.endSession();
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    if (gateway === "razorpay" && paymentStatus === "success") {
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        throw new Error("Invalid Razorpay signature");
      }

      const payment = await razorpay.payments.fetch(razorpay_payment_id);

      order.paymentStatus = "paid";
      order.orderStatus = "confirmed";
      order.onlinePaymentType = "razorpay";
      order.confirmedAt = new Date();

      order.paymentDetails.push({
        provider: "razorpay",
        transactionId: razorpay_payment_id,
        paymentMethod: payment.method,
        amount: (payment.amount as number) / 100,
        currency: payment.currency,
        status: payment.status,
        paidAt: new Date(payment.created_at * 1000),
      });

      await decrementStock(order._id, dbSession);
      await order.save({ session: dbSession });

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

        await Coupon.findByIdAndUpdate(
          order.coupon.couponId,
          { $inc: { usageCount: 1 } },
          { session: dbSession }
        );
      }
    }

    await dbSession.commitTransaction();
    dbSession.endSession();

    return NextResponse.json({
      success: true,
      message: "Payment callback processed",
      order,
    });
  } catch (error: any) {
    if (dbSession.inTransaction()) {
      await dbSession.abortTransaction();
    }
    dbSession.endSession();

    console.error("Payment Callback Error:", error);
    return NextResponse.json(
      { success: false, message: `Payment callback failed: ${error.message}` },
      { status: 500 }
    );
  }
};
