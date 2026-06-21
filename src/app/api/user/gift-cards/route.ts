import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import GiftCard from "@/models/giftCard.model";

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Fetch all gift cards purchased by this user, populated with optional redeemer details
    const giftCards = await GiftCard.find({ purchasedBy: currentUser._id })
      .populate("redeemedBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      giftCards,
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/user/gift-cards error:", error);
    return NextResponse.json(
      { message: `Error fetching gift cards: ${error.message}` },
      { status: 500 }
    );
  }
}
