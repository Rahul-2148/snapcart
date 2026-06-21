import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/walletTransaction.model";
import Stripe from "stripe";

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

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ message: "Session ID is required" }, { status: 400 });
    }

    await connectDb();

    // Verify session state from Stripe
    const stripe = getStripeClient();
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (!stripeSession) {
      return NextResponse.json({ message: "Invalid payment session" }, { status: 400 });
    }

    if (stripeSession.payment_status !== "paid") {
      return NextResponse.json({ message: "Payment has not been completed" }, { status: 400 });
    }

    if (stripeSession.metadata?.type !== "wallet_deposit") {
      return NextResponse.json({ message: "Invalid session type" }, { status: 400 });
    }

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

    // Check if we already processed this session to prevent double crediting
    const existingTransaction = await WalletTransaction.findOne({
      walletId: wallet._id,
      referenceId: sessionId,
    });

    if (existingTransaction) {
      return NextResponse.json({
        success: true,
        message: "Deposit already processed",
        balance: wallet.balance,
      }, { status: 200 });
    }

    const amount = Number(stripeSession.metadata.amount);

    // Increment balance
    wallet.balance += amount;
    await wallet.save();

    // Log credit transaction
    const newTransaction = new WalletTransaction({
      walletId: wallet._id,
      type: "credit",
      amount,
      description: "Direct wallet deposit via Stripe",
      status: "completed",
      referenceId: sessionId,
    });
    await newTransaction.save();

    return NextResponse.json({
      success: true,
      message: "Direct deposit verified and credited!",
      balance: wallet.balance,
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST /api/user/wallet/verify-stripe error:", error);
    return NextResponse.json(
      { message: `Error verifying Stripe payment: ${error.message}` },
      { status: 500 }
    );
  }
}
