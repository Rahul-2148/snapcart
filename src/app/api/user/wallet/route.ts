import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/walletTransaction.model";

import mongoose from "mongoose";
import GiftCard from "@/models/giftCard.model";

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

    // Find or create wallet for the user
    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = new Wallet({
        user: user._id,
        role: user.role === "delivery-boy" ? "delivery-boy" : "user",
        balance: 0,
      });
      await wallet.save();
    }

    // Fetch transactions
    const transactions = await WalletTransaction.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .lean();

    // Check and batch fetch gift card details for matching referenceIds
    const giftCardIds = transactions
      .map((t) => t.referenceId)
      .filter((refId): refId is string => {
        if (!refId) return false;
        return mongoose.Types.ObjectId.isValid(refId);
      });

    const giftCardsMap: Record<string, { code: string; pin: string }> = {};
    if (giftCardIds.length > 0) {
      const giftCards = await GiftCard.find({ _id: { $in: giftCardIds } }).lean();
      giftCards.forEach((card) => {
        giftCardsMap[card._id.toString()] = {
          code: card.code,
          pin: card.pin,
        };
      });
    }

    const populatedTransactions = transactions.map((t) => {
      if (t.referenceId && giftCardsMap[t.referenceId]) {
        return {
          ...t,
          giftCardCode: giftCardsMap[t.referenceId].code,
          giftCardPin: giftCardsMap[t.referenceId].pin,
        };
      }
      return t;
    });

    return NextResponse.json({
      success: true,
      balance: wallet.balance,
      transactions: populatedTransactions,
    }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/user/wallet error:", error);
    return NextResponse.json(
      { message: `Error fetching wallet: ${error.message}` },
      { status: 500 }
    );
  }
}
