import { NextRequest, NextResponse } from "next/server";
import connectDb, { startDbSession } from "@/lib/server/db";
import { auth } from "@/auth";
import { Order } from "@/models/order.model";
import { OrderItem } from "@/models/orderItem.model";
import { User } from "@/models/user.model";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { PaymentSession } from "@/models/paymentSession.model";
import {
  broadcastOrderToPartners,
  calculateDistance,
  computePayout,
  estimateDeliveryTime,
  getOrCreateDeliverySettings,
} from "@/lib/server/delivery";
import Stripe from "stripe";
import mongoose from "mongoose";
import crypto from "crypto";
import Razorpay from "razorpay";
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
  const stripeSignature = req.headers.get("stripe-signature");

  /**
   * ======================================================
   * STRIPE WEBHOOK HANDLER
   * ======================================================
   */
  if (stripeSignature) {
    const dbSession = await startDbSession();

    try {
      const body = await req.text();
      const stripe = getStripeClient();

      const event = stripe.webhooks.constructEvent(
        body,
        stripeSignature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      let assignment: any = null;
      let processedOrderId: string | null = null;
      if (event.type === "checkout.session.completed") {
        await connectDb();

        const session = event.data.object as Stripe.Checkout.Session;
        const paymentSessionId = session.metadata?.paymentSessionId;

        if (!paymentSessionId) {
          throw new Error("Payment session ID missing in Stripe metadata");
        }

        const order = await createOrderFromPaymentSession(
          paymentSessionId,
          {
            provider: "stripe",
            transactionId: (session.payment_intent as string) || "",
            paymentMethod: session.payment_method_types?.[0] ?? "card",
            amount: session.amount_total! / 100,
            currency: session.currency!,
            status: "succeeded",
            paidAt: new Date(),
          },
          dbSession
        );

        assignment = await createAssignmentIfNeeded(order, dbSession);
        processedOrderId = order._id.toString();
      }

      if (dbSession) {
        await dbSession.commitTransaction();
        dbSession.endSession();
      }

      try {
        if (processedOrderId) {
          await sendConfirmationEmailForOrder(processedOrderId);
        }
      } catch (emailError) {
        console.error("Error sending order confirmation email (Stripe webhook):", emailError);
      }

      if (assignment?._id) {
        try {
          await broadcastOrderToPartners(assignment._id.toString());
        } catch (error) {
          console.error("Broadcast error (Stripe webhook):", error);
        }
      }

      return NextResponse.json({ success: true, received: true });
    } catch (error) {
      if (dbSession) {
        if (dbSession.inTransaction()) {
          await dbSession.abortTransaction();
        }
        dbSession.endSession();
      }

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
  const dbSession = await startDbSession();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      if (dbSession) {
        await dbSession.abortTransaction();
        dbSession.endSession();
      }
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const body = await req.json();
    const {
      paymentSessionId,
      paymentStatus,
      gateway,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (!paymentSessionId || !paymentStatus || !gateway) {
      throw new Error("Missing required fields");
    }

    const paymentSession = await PaymentSession.findById(paymentSessionId).session(
      dbSession
    );
    if (!paymentSession) {
      if (dbSession) {
        await dbSession.abortTransaction();
        dbSession.endSession();
      }
      return NextResponse.json({ message: "Payment session not found" }, { status: 404 });
    }

    if (paymentSession.userId.toString() !== session.user.id) {
      if (dbSession) {
        await dbSession.abortTransaction();
        dbSession.endSession();
      }
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    let assignment: any = null;
    let processedOrderId: string | null = null;
    if (gateway === "razorpay" && paymentStatus === "success") {
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        throw new Error("Invalid Razorpay signature");
      }

      const razorpay = getRazorpayClient();
      const payment = await razorpay.payments.fetch(razorpay_payment_id);

      try {
        const order = await createOrderFromPaymentSession(
          paymentSessionId,
          {
            provider: "razorpay",
            transactionId: razorpay_payment_id,
            paymentMethod: payment.method,
            amount: (payment.amount as number) / 100,
            currency: payment.currency,
            status: payment.status,
            paidAt: new Date(payment.created_at * 1000),
          },
          dbSession
        );

        assignment = await createAssignmentIfNeeded(order, dbSession);
        processedOrderId = order._id.toString();
      } catch (error: any) {
        if (error?.message?.includes("already processed")) {
          if (dbSession) {
            await dbSession.commitTransaction();
            dbSession.endSession();
          }
          return NextResponse.json({
            success: true,
            message: "Already processed",
          });
        }
        throw error;
      }
    }

    if (dbSession) {
      await dbSession.commitTransaction();
      dbSession.endSession();
    }

    try {
      if (processedOrderId) {
        await sendConfirmationEmailForOrder(processedOrderId);
      }
    } catch (emailError) {
      console.error("Error sending order confirmation email (Razorpay callback):", emailError);
    }

    if (assignment?._id) {
      try {
        await broadcastOrderToPartners(assignment._id.toString());
      } catch (error) {
        console.error("Broadcast error (Razorpay callback):", error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment callback processed",
      orderId: processedOrderId,
    });
  } catch (error: any) {
    if (dbSession) {
      if (dbSession.inTransaction()) {
        await dbSession.abortTransaction();
      }
      dbSession.endSession();
    }

    console.error("Payment Callback Error:", error);
    return NextResponse.json(
      { success: false, message: `Payment callback failed: ${error.message}` },
      { status: 500 }
    );
  }
};
