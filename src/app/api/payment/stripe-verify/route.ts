// src/app/api/payment/stripe-verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb, { startDbSession } from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { PaymentSession } from "@/models/paymentSession.model";
import Stripe from "stripe";
import mongoose from "mongoose";

import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { OrderItem } from "@/models/orderItem.model";
import { User } from "@/models/user.model";
import {
  broadcastOrderToPartners,
  calculateDistance,
  computePayout,
  estimateDeliveryTime,
  getOrCreateDeliverySettings,
} from "@/lib/server/delivery";
import { sendOrderConfirmationEmail } from "@/lib/server/email";
import { createOrderFromPaymentSession } from "@/lib/server/createOrderFromPaymentSession";

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

const createAssignmentIfNeeded = async (order: any, dbSession?: any) => {
  if (!order || order.assignment) return null;
  if (order.orderStatus !== "confirmed") return null;
  const location = order.deliveryAddress?.location;
  if (!location?.lat || !location?.lng) return null;

  const settings = await getOrCreateDeliverySettings();
  const distance = calculateDistance(
    settings.storeLocation.lat,
    settings.storeLocation.lng,
    location.lat,
    location.lng,
  );
  const estimatedTime = estimateDeliveryTime(distance);
  const rewardAmount = computePayout(distance, settings);

  const assignment = new DeliveryAssignment({
    order: order._id,
    orderNumber: order.orderNumber,
    pickupLocation: {
      address: settings.storeLocation.address,
      lat: settings.storeLocation.lat,
      lng: settings.storeLocation.lng,
      pincode: settings.storeLocation.pincode,
    },
    deliveryLocation: {
      address: order.deliveryAddress.fullAddress,
      fullName: order.deliveryAddress.fullName,
      mobile: order.deliveryAddress.mobile,
      lat: location.lat,
      lng: location.lng,
      pincode: order.deliveryAddress.pincode,
    },
    estimatedDistance: distance,
    estimatedTime,
    rewardAmount,
    status: "broadcasted",
    priority: "normal",
    timeline: [
      {
        status: "broadcasted",
        timestamp: new Date(),
        note: "Order confirmed and broadcasted to nearby partners",
      },
    ],
  });

  await assignment.save({ session: dbSession } as any);
  order.assignment = assignment._id;
  await order.save({ session: dbSession } as any);
  return assignment;
};

const sendConfirmationEmailForOrder = async (orderId: string) => {
  const order = await Order.findById(orderId).populate({
    path: "orderItems",
    model: OrderItem,
  });
  if (!order) return;

  const user = await User.findById(order.userId);
  if (!user) return;

  const populatedOrderItems = await OrderItem.find({ order: order._id }).populate({
    path: "grocery",
    select: "name images",
  });

  const emailItems = populatedOrderItems.map((item: any) => ({
    name: item.groceryName || item.grocery?.name,
    quantity: item.quantity,
    price: item.price.sellingPrice,
    imageUrl: item.grocery?.images?.[0]?.url,
  }));

  await sendOrderConfirmationEmail(user.email, user.name, {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    orderDate: new Date(order.createdAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    items: emailItems,
    subTotal: order.subTotal,
    deliveryFee: order.deliveryFee,
    codHandlingCharge: order.codHandlingCharge || 0,
    couponDiscount: order.couponDiscount || 0,
    finalTotal: order.finalTotal,
    currency: "₹",
    deliveryAddress: order.deliveryAddress,
    paymentMethod: "online",
  });
};

export const POST = async (req: NextRequest) => {
  const dbSession = await startDbSession();
  let sessionId: string | undefined;
  let paymentSessionId: string | undefined;
  try {
    const body = await req.json();
    sessionId = body?.sessionId;
    if (!sessionId) {
      if (dbSession) {
        await dbSession.abortTransaction();
      }
      return NextResponse.json({ message: "Session ID is required" }, { status: 400 });
    }

    await connectDb();
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.retrieve(sessionId as string, {
      expand: ["payment_intent"],
    });

    if (!session || !session.metadata?.paymentSessionId) {
      if (dbSession) {
        await dbSession.abortTransaction();
      }
      return NextResponse.json(
        { message: "Invalid session or payment session ID missing" },
        { status: 400 }
      );
    }

    paymentSessionId = session.metadata.paymentSessionId;

    if (session.payment_status !== "paid") {
      // Nothing to create if payment not completed
      if (dbSession) {
        await dbSession.abortTransaction();
      }
      return NextResponse.json({ success: false, message: "Payment not completed" }, { status: 400 });
    }

    const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null;

    const order = await createOrderFromPaymentSession(
      paymentSessionId,
      {
        provider: "stripe",
        transactionId: paymentIntent?.id ?? String(session.payment_intent ?? ""),
        paymentMethod: session.payment_method_types?.[0] ?? "card",
        amount: (session.amount_total ?? 0) / 100,
        currency: session.currency ?? "INR",
        status: "succeeded",
        paidAt: new Date(),
      },
      dbSession
    );

    const assignment = await createAssignmentIfNeeded(order, dbSession);

    if (dbSession) {
      await dbSession.commitTransaction();
    }

    // non-transactional post-processing
    try {
      await sendConfirmationEmailForOrder(order._id.toString());
    } catch (emailError) {
      console.error("Error sending order confirmation email (Stripe verify):", emailError);
    }

    if (assignment?._id) {
      try {
        await broadcastOrderToPartners(assignment._id.toString());
      } catch (error) {
        console.error("Broadcast error (Stripe verify):", error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and order created.",
      order,
    });
  } catch (error) {
    if (dbSession && dbSession.inTransaction()) await dbSession.abortTransaction();
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("being processed") || errorMessage.includes("already processed")) {
      try {
        await connectDb();
        if (!paymentSessionId) {
          throw new Error("Payment session ID missing for fallback");
        }
        const paymentSession = await PaymentSession.findById(paymentSessionId).lean();
        if (paymentSession?.orderId) {
          const existingOrder = await Order.findById(paymentSession.orderId);
          if (existingOrder) {
            return NextResponse.json({
              success: true,
              message: "Payment already processed.",
              order: existingOrder,
            });
          }
        }
      } catch (fetchError) {
        console.error("Stripe verification fallback error:", fetchError);
      }
    }
    console.error("Stripe Verification Error:", error);
    return NextResponse.json(
      { success: false, message: `Stripe verification error: ${errorMessage}` },
      { status: 500 }
    );
  } finally {
    if (dbSession) {
      dbSession.endSession();
    }
  }
};
