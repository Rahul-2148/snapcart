import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Razorpay from "razorpay";

export const dynamic = "force-dynamic";

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

const GOLD_PRICE = 49; // ₹49/month

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required to subscribe to Snapcart Gold" },
        { status: 401 }
      );
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }



    // Create real Razorpay order — no wallet/mock/fake payments
    const razorpay = getRazorpayClient();

    const razorpayOrder = await razorpay.orders.create({
      amount: GOLD_PRICE * 100, // amount in paise
      currency: "INR",
      receipt: `GOLD-${user._id.toString().slice(-8)}-${Date.now().toString(36)}`,
      notes: {
        userId: user._id.toString(),
        purpose: "snapcart_gold_subscription",
      },
    });

    return NextResponse.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      userName: user.name || "",
      userEmail: user.email || "",
      userPhone: user.phone || "",
    });
  } catch (error: any) {
    console.error("Gold subscription error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process subscription" },
      { status: 500 }
    );
  }
}
