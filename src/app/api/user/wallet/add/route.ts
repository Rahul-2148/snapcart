import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Stripe from "stripe";
import Razorpay from "razorpay";

// Initialize Stripe Client
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

// Initialize Razorpay Client
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

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { amount, gateway = "stripe" } = await req.json();
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ message: "Valid amount is required" }, { status: 400 });
    }

    if (gateway === "stripe" && amount < 50) {
      return NextResponse.json({ message: "Minimum deposit value for Stripe is ₹50" }, { status: 400 });
    }

    if (gateway === "razorpay" && amount < 1) {
      return NextResponse.json({ message: "Minimum deposit value for Razorpay is ₹1" }, { status: 400 });
    }

    await connectDb();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const isKycApproved = currentUser.kyc?.status === "approved";
    if (!isKycApproved && amount > 10000) {
      return NextResponse.json(
        { message: "Add money limit is ₹10,000 for unverified users. Complete DigiLocker KYC first." },
        { status: 403 }
      );
    }

    if (gateway === "stripe") {
      const stripe = getStripeClient();

      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: `SnapCart Wallet Deposit - ₹${amount}`,
                description: "Direct addition of funds into your SnapCart secure wallet.",
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.NEXTAUTH_URL}/user/account/wallet?deposit_status=success&amount=${amount}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/user/account/wallet?deposit_status=cancelled`,
        metadata: {
          userId: currentUser._id.toString(),
          amount: amount.toString(),
          type: "wallet_deposit",
        },
      });

      return NextResponse.json({
        success: true,
        gateway: "stripe",
        url: stripeSession.url,
      }, { status: 200 });

    } else if (gateway === "razorpay") {
      const razorpay = getRazorpayClient();

      const options = {
        amount: Math.round(amount * 100), // in paise
        currency: "INR",
        receipt: `WD-${new Date().getTime().toString().slice(-6)}`,
        notes: {
          type: "wallet_deposit",
          userId: currentUser._id.toString(),
          amount: amount.toString(),
        },
      };

      const razorpayOrder = await razorpay.orders.create(options);

      return NextResponse.json({
        success: true,
        gateway: "razorpay",
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
      }, { status: 200 });
    }

    return NextResponse.json({ message: "Invalid payment gateway" }, { status: 400 });

  } catch (error: any) {
    console.error("POST /api/user/wallet/add error:", error);
    return NextResponse.json(
      { message: `Error creating wallet payment session: ${error.message}` },
      { status: 500 }
    );
  }
}
