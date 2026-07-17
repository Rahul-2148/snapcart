import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/walletTransaction.model";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const GOLD_PRICE = 49;

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, message: "Missing Razorpay payment details" },
        { status: 400 }
      );
    }

    // Verify Razorpay signature — same pattern as payment/callback/route.ts
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("RAZORPAY_KEY_SECRET not configured");
    }

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { success: false, message: "Payment verification failed — invalid signature" },
        { status: 400 }
      );
    }

    // Signature is valid — activate Gold membership
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Activate or Extend Gold
    user.isGoldMember = true;
    let expiry = new Date();
    if (user.goldExpiryDate && new Date(user.goldExpiryDate) > expiry) {
      expiry = new Date(user.goldExpiryDate);
    }
    expiry.setDate(expiry.getDate() + 30);
    user.goldExpiryDate = expiry;
    await user.save();

    // Record transaction for audit trail
    let wallet = await Wallet.findOne({ user: user._id, role: "user" });
    if (!wallet) {
      wallet = await Wallet.create({ user: user._id, role: "user", balance: 0 });
    }

    await WalletTransaction.create({
      walletId: wallet._id,
      type: "debit",
      amount: GOLD_PRICE,
      description: `Snapcart Gold Subscription (1 Month) — Razorpay ${razorpay_payment_id}`,
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      message: "Congratulations! You are now a Snapcart Gold Member!",
      isGoldMember: true,
      goldExpiryDate: expiry,
      walletBalance: wallet.balance,
      paymentMethod: "razorpay",
    });
  } catch (error: any) {
    console.error("Gold verification error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
