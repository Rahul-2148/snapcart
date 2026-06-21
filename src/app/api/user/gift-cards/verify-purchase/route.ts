import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import GiftCard from "@/models/giftCard.model";
import Stripe from "stripe";
import { sendGiftCardPurchaseEmail } from "@/lib/server/email";

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

// Helper to generate a 16-digit code
function generateCardCode(): string {
  let code = "";
  for (let i = 0; i < 16; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

// Helper to generate a 6-digit pin
function generatePin(): string {
  let pin = "";
  for (let i = 0; i < 6; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
}

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

    if (stripeSession.metadata?.type !== "gift_card_purchase") {
      return NextResponse.json({ message: "Invalid session type" }, { status: 400 });
    }

    // Check if we already generated a gift card for this session
    const existingGiftCard = await GiftCard.findOne({ stripeSessionId: sessionId });
    if (existingGiftCard) {
      return NextResponse.json({
        success: true,
        message: "Voucher already verified",
        giftCard: {
          code: existingGiftCard.code,
          pin: existingGiftCard.pin,
          amount: existingGiftCard.amount,
          expiresAt: existingGiftCard.expiresAt,
        }
      }, { status: 200 });
    }

    // Generate unique card details
    let uniqueCode = "";
    let isUnique = false;

    while (!isUnique) {
      uniqueCode = generateCardCode();
      const existingCard = await GiftCard.findOne({ code: uniqueCode });
      if (!existingCard) {
        isUnique = true;
      }
    }

    const generatedPin = generatePin();
    const amount = Number(stripeSession.metadata.amount);

    const newCard = new GiftCard({
      code: uniqueCode,
      pin: generatedPin,
      amount,
      status: "active",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      stripeSessionId: sessionId,
      purchasedBy: stripeSession.metadata?.userId || undefined,
    });

    await newCard.save();

    // Send email confirmation asynchronously
    try {
      await sendGiftCardPurchaseEmail(
        session.user.email,
        session.user.name || "Customer",
        {
          code: uniqueCode,
          pin: generatedPin,
          amount: newCard.amount,
          expiresAt: newCard.expiresAt,
        }
      );
    } catch (emailErr) {
      console.error("Error sending gift card purchase email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and voucher generated!",
      giftCard: {
        code: uniqueCode,
        pin: generatedPin,
        amount: newCard.amount,
        expiresAt: newCard.expiresAt,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST /api/user/gift-cards/verify-purchase error:", error);
    return NextResponse.json(
      { message: `Error verifying payment: ${error.message}` },
      { status: 500 }
    );
  }
}
