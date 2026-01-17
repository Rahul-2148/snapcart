// src/app/api/payment/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { OrderItem } from "@/models/orderItem.model";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = async (req: NextRequest) => {
  try {
    await connectDb();
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { message: "Order ID is required" },
        { status: 400 }
      );
    }

    const order = await Order.findById(orderId).populate({
      path: "orderItems",
      model: OrderItem,
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    const line_items = order.orderItems.map((item: any) => {
      return {
        price_data: {
          currency: order.currency.toLowerCase(),
          product_data: {
            name: item.groceryName,
            metadata: {
              variantLabel: item.variant.label,
            },
          },
          unit_amount: Math.round(item.price.sellingPrice * 100),
        },
        quantity: item.quantity,
      };
    });

    // Add delivery fee as a line item if it exists
    if (order.deliveryFee > 0) {
      line_items.push({
        price_data: {
          currency: order.currency.toLowerCase(),
          product_data: {
            name: "Delivery Fee",
          },
          unit_amount: Math.round(order.deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    let sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL}/user/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/user/payment/cancel`,
      metadata: {
        orderId: order._id.toString(),
      },
    };

    // Handle coupon discount
    if (order.couponDiscount && order.couponDiscount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(order.couponDiscount * 100),
        currency: order.currency.toLowerCase(),
        duration: "once",
        name: `Coupon: ${order.coupon?.code}`,
      });
      sessionConfig.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ session });
  } catch (error: any) {
    console.error("Stripe session creation error:", error);
    return NextResponse.json(
      { message: `Failed to create Stripe session: ${error.message}` },
      { status: 500 }
    );
  }
};