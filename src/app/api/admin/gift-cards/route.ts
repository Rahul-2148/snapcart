import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import GiftCard from "@/models/giftCard.model";

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

// GET: List all generated gift cards
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser || !currentUser.roles?.includes("admin")) {
      return NextResponse.json({ message: "Forbidden: Admin role required" }, { status: 403 });
    }

    const giftCards = await GiftCard.find()
      .populate("purchasedBy", "name email mobileNumber")
      .populate("redeemedBy", "name email mobileNumber")
      .sort({ createdAt: -1 })
      .lean();

    const safeGiftCards = giftCards.map((card: any) => {
      const isUserPurchased = !!card.purchasedBy;
      const isRedeemed = card.status === "redeemed";
      const shouldMask = isUserPurchased || isRedeemed;

      return {
        ...card,
        code: shouldMask ? `••••••••••••${card.code.slice(-4)}` : card.code,
        pin: shouldMask ? "••••••" : card.pin,
        isUserPurchased,
      };
    });

    return NextResponse.json({
      success: true,
      giftCards: safeGiftCards,
    }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/gift-cards error:", error);
    return NextResponse.json(
      { message: `Error fetching gift cards: ${error.message}` },
      { status: 500 }
    );
  }
}

// POST: Generate new gift cards
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser || !currentUser.roles?.includes("admin")) {
      return NextResponse.json({ message: "Forbidden: Admin role required" }, { status: 403 });
    }

    const { amount, expiresAt, count = 1 } = await req.json();

    if (!amount || amount < 10) {
      return NextResponse.json({ message: "Amount must be a number greater than or equal to ₹10" }, { status: 400 });
    }

    const numCount = Math.min(Math.max(Number(count), 1), 100); // Limit bulk creation to 100 at a time

    const expiresDate = expiresAt 
      ? new Date(expiresAt) 
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default 1 year expiry

    const generatedCards = [];

    for (let i = 0; i < numCount; i++) {
      let uniqueCode = "";
      let isUnique = false;

      // Uniqueness retry loop
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
        amount,
        status: "active",
        expiresAt: expiresDate,
      });

      await newCard.save();
      generatedCards.push(newCard);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${numCount} gift card(s)`,
      generatedCards,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/gift-cards error:", error);
    return NextResponse.json(
      { message: `Error generating gift cards: ${error.message}` },
      { status: 500 }
    );
  }
}
