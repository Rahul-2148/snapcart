// src/app/api/payment/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { PaymentSession } from "@/models/paymentSession.model";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = async (req: NextRequest) => {
  try {
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

    const line_items = paymentSession.items.map((item: any) => {
      return {
        price_data: {
          currency: paymentSession.currency.toLowerCase(),
          product_data: {
            name: item.groceryName,
            metadata: {
              variantLabel: item.variantLabel,
            },
          },
          unit_amount: Math.round(item.price.sellingPrice * 100),
        },
        quantity: item.quantity,
      };
    });

    // Add delivery fee as a line item if it exists
    if (paymentSession.deliveryFee > 0) {
      line_items.push({
        price_data: {
          currency: paymentSession.currency.toLowerCase(),
          product_data: {
            name: "Delivery Fee",
          },
          unit_amount: Math.round(paymentSession.deliveryFee * 100),
        },
        quantity: 1,
      });
    }

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

    // Handle coupon discount
    if (paymentSession.couponDiscount && paymentSession.couponDiscount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(paymentSession.couponDiscount * 100),
        currency: paymentSession.currency.toLowerCase(),
        duration: "once",
        name: `Coupon: ${paymentSession.coupon?.code}`,
      });
      sessionConfig.discounts = [{ coupon: coupon.id }];
    }

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