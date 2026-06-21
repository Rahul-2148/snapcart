import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Reward from "@/models/reward.model";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/walletTransaction.model";
import mongoose from "mongoose";

// GET: Fetch user's coins and scratchcards
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find or create rewards profile
    let reward = await Reward.findOne({ userId: user._id });
    if (!reward) {
      reward = new Reward({
        userId: user._id,
        coins: 0,
        scratchCards: [],
      });
      await reward.save();
    }

    return NextResponse.json({
      success: true,
      coins: reward.coins,
      scratchCards: reward.scratchCards,
    }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/user/rewards error:", error);
    return NextResponse.json(
      { message: `Error fetching rewards: ${error.message}` },
      { status: 500 }
    );
  }
}

// POST: Scratch a card and redeem cashback
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { scratchCardId } = await req.json();
    if (!scratchCardId) {
      return NextResponse.json({ message: "Scratch card ID is required" }, { status: 400 });
    }

    await connectDb();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find reward profile
    const reward = await Reward.findOne({ userId: user._id });
    if (!reward) {
      return NextResponse.json({ message: "Rewards profile not found" }, { status: 404 });
    }

    const card = reward.scratchCards.find(
      (c: any) => c._id.toString() === scratchCardId
    );

    if (!card) {
      return NextResponse.json({ message: "Scratch card not found" }, { status: 404 });
    }

    if (card.status === "scratched") {
      return NextResponse.json({ message: "Scratch card is already scratched" }, { status: 400 });
    }

    // Bounded rewards (Anti-bankruptcy logic)
    const rand = Math.random();
    let rewardType: "cashback" | "voucher" | "better_luck";
    let cashbackEarned = 0;
    let voucherTitle = "";
    let voucherCode = "";

    if (rand < 0.40) {
      rewardType = "cashback";
      cashbackEarned = Math.floor(Math.random() * (15 - 5 + 1)) + 5; // Bounded ₹5 to ₹15
    } else if (rand < 0.70) {
      rewardType = "voucher";
      const pool = [
        { title: "Domino's: Flat ₹100 Off", prefix: "DOMINOS" },
        { title: "Swiggy: Free Delivery (Min order ₹199)", prefix: "SWIGGYFD" },
        { title: "Ajio: Extra 15% Off on ₹1499+", prefix: "AJIO15" },
        { title: "Myntra: Flat ₹200 Off on Select Styles", prefix: "MYNTRA200" },
        { title: "Pharmeasy: Flat 20% Off on Medicines", prefix: "PHARM20" },
        { title: "PVR Cinemas: Buy 1 Get 1 Ticket Free", prefix: "PVRBOGO" }
      ];
      const selected = pool[Math.floor(Math.random() * pool.length)];
      voucherTitle = selected.title;
      voucherCode = selected.prefix + Math.random().toString(36).substring(2, 8).toUpperCase();
    } else {
      rewardType = "better_luck";
    }

    // Update scratch card in rewards document
    card.status = "scratched";
    card.rewardType = rewardType;
    card.scratchedAt = new Date();
    if (rewardType === "cashback") {
      card.value = cashbackEarned;
    } else if (rewardType === "voucher") {
      card.value = 0;
      card.voucherTitle = voucherTitle;
      card.voucherCode = voucherCode;
    } else {
      card.value = 0;
    }

    await reward.save();

    // Credit to user's wallet ONLY if type is cashback
    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = new Wallet({
        user: user._id,
        role: "user",
        balance: 0,
      });
      await wallet.save();
    }

    if (rewardType === "cashback") {
      wallet.balance += cashbackEarned;
      await wallet.save();

      // Log the transaction
      const transaction = new WalletTransaction({
        walletId: wallet._id,
        type: "credit",
        amount: cashbackEarned,
        description: `Cashback won from Scratchcard (Order: ${card.earnedForOrder})`,
        status: "completed",
        referenceId: card.earnedForOrder,
      });
      await transaction.save();
    }

    return NextResponse.json({
      success: true,
      rewardType,
      cashbackEarned,
      voucherTitle,
      voucherCode,
      balance: wallet.balance,
    }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/user/rewards error:", error);
    return NextResponse.json(
      { message: `Error processing rewards: ${error.message}` },
      { status: 500 }
    );
  }
}
