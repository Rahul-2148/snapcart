import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/walletTransaction.model";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const wallet = await Wallet.findOne({ user: session.user.id, role: "user" });
    if (!wallet) {
      return NextResponse.json({
        success: true,
        transactions: [],
      });
    }

    // Fetch transactions containing "Snapcart Gold" or "GOLD" in the description
    const transactions = await WalletTransaction.find({
      walletId: wallet._id,
      description: { $regex: /Snapcart Gold/i },
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      transactions,
    });
  } catch (error: any) {
    console.error("Error fetching gold transactions:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
