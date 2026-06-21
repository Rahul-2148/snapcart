import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/walletTransaction.model";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, amount } = await req.json();
    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature || !amount) {
      return NextResponse.json({ message: "Missing payment parameters" }, { status: 400 });
    }

    // Cryptographic signature check
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("RAZORPAY_KEY_SECRET not configured");
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return NextResponse.json({ message: "Signature verification failed" }, { status: 400 });
    }

    await connectDb();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find or create wallet for the user
    let wallet = await Wallet.findOne({ user: currentUser._id });
    if (!wallet) {
      wallet = new Wallet({
        user: currentUser._id,
        role: currentUser.role === "delivery-boy" ? "delivery-boy" : "user",
        balance: 0,
      });
      await wallet.save();
    }

    // Check if we already processed this order to prevent double crediting
    const existingTransaction = await WalletTransaction.findOne({
      walletId: wallet._id,
      referenceId: razorpayOrderId,
    });

    if (existingTransaction) {
      return NextResponse.json({
        success: true,
        message: "Deposit already processed",
        balance: wallet.balance,
      }, { status: 200 });
    }

    // Increment balance
    const depositAmount = Number(amount);
    wallet.balance += depositAmount;
    await wallet.save();

    // Log credit transaction
    const newTransaction = new WalletTransaction({
      walletId: wallet._id,
      type: "credit",
      amount: depositAmount,
      description: "Direct wallet deposit via Razorpay",
      status: "completed",
      referenceId: razorpayOrderId,
    });
    await newTransaction.save();

    return NextResponse.json({
      success: true,
      message: "Direct deposit verified and credited!",
      balance: wallet.balance,
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST /api/user/wallet/verify-razorpay error:", error);
    return NextResponse.json(
      { message: `Error verifying signature: ${error.message}` },
      { status: 500 }
    );
  }
}
