import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import GiftCard from "@/models/giftCard.model";
import crypto from "crypto";
import { sendGiftCardPurchaseEmail } from "@/lib/server/email";

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

    // Check if we already processed this order
    const existingGiftCard = await GiftCard.findOne({ razorpayOrderId });
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

    const newCard = new GiftCard({
      code: uniqueCode,
      pin: generatedPin,
      amount: Number(amount),
      status: "active",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      razorpayOrderId,
      purchasedBy: currentUser._id,
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
    console.error("POST /api/user/gift-cards/verify-razorpay error:", error);
    try {
      const fs = require("fs");
      fs.writeFileSync("C:/Users/Rahul Raj Modi/.gemini/antigravity-ide/brain/b787e1d8-7d4a-4539-80b4-8c9b41de396b/scratch/error-log.txt", error.stack || error.message);
    } catch (e) {}
    return NextResponse.json(
      { message: `Error verifying signature: ${error.message}` },
      { status: 500 }
    );
  }
}
