// src/app/api/payment/razorpay/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Order } from "@/models/order.model";
import { PaymentSession } from "@/models/paymentSession.model";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import {
  broadcastOrderToPartners,
  calculateDistance,
  computePayout,
  estimateDeliveryTime,
  getOrCreateDeliverySettings,
} from "@/lib/server/delivery";
import { sendOrderConfirmationEmail } from "@/lib/server/email";
import { OrderItem } from "@/models/orderItem.model";
import { User } from "@/models/user.model";
import { createOrderFromPaymentSession } from "@/lib/server/createOrderFromPaymentSession";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("Razorpay key/secret not set");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

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
  const signature = req.headers.get("x-razorpay-signature");

  // If signature exists, it's a webhook from Razorpay
  if (signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const body = await req.text();

    try {
      (razorpay.webhooks as any).validateWebhookSignature(body, signature, secret);
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
    const paymentSessionId = payment.notes?.paymentSessionId;

    if (!paymentSessionId) {
      return NextResponse.json(
        { message: "Payment session ID not found in webhook payload" },
        { status: 400 }
      );
    }

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    let assignment: any = null;
    let processedOrderId: string | null = null;
    try {
      await connectDb();
      const order = await createOrderFromPaymentSession(
        paymentSessionId,
        {
          provider: "razorpay",
          transactionId: payment.id,
          paymentMethod: payment.method,
          amount: payment.amount / 100,
          currency: payment.currency,
          status: payment.status,
          paidAt: new Date(),
        },
        dbSession
      );

      assignment = await createAssignmentIfNeeded(order, dbSession);
      processedOrderId = order._id.toString();
      await dbSession.commitTransaction();

      if (assignment?._id) {
        try {
          await broadcastOrderToPartners(assignment._id.toString());
        } catch (error) {
          console.error("Broadcast error (Razorpay webhook):", error);
        }
      }

      try {
        if (processedOrderId) {
          await sendConfirmationEmailForOrder(processedOrderId);
        }
      } catch (emailError) {
        console.error("Error sending order confirmation email (Razorpay webhook):", emailError);
      }

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
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

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

      if (paymentSession.userId.toString() !== session.user.id) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      if (paymentSession.status !== "pending") {
        return NextResponse.json(
          { message: "Payment session already processed" },
          { status: 400 }
        );
      }

      const options = {
        amount: paymentSession.finalTotal * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: `PS-${paymentSession._id.toString().slice(-6)}`,
        notes: {
          paymentSessionId: paymentSession._id.toString(),
        },
      };

      const razorpayOrder = await razorpay.orders.create(options);

      paymentSession.providerSessionId = razorpayOrder.id;
      await paymentSession.save();

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
