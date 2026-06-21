import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/walletTransaction.model";
import Withdrawal from "@/models/withdrawal.model";

// GET: List all withdrawal payout requests for admin dashboard
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

    // Fetch all payouts, populating user details
    const withdrawals = await Withdrawal.find()
      .populate("userId", "name email mobileNumber role")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      withdrawals,
    }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/payouts error:", error);
    return NextResponse.json(
      { message: `Error fetching withdrawals: ${error.message}` },
      { status: 500 }
    );
  }
}

// PUT: Approve or reject a payout request
export async function PUT(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { withdrawalId, status, adminNote } = await req.json();
    if (!withdrawalId || !status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ message: "Invalid parameters" }, { status: 400 });
    }

    await connectDb();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser || !currentUser.roles?.includes("admin")) {
      return NextResponse.json({ message: "Forbidden: Admin role required" }, { status: 403 });
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return NextResponse.json({ message: "Withdrawal request not found" }, { status: 404 });
    }

    if (withdrawal.status !== "pending") {
      return NextResponse.json({ message: "Withdrawal request has already been processed" }, { status: 400 });
    }

    // Process approval/rejection
    if (status === "approved") {
      withdrawal.status = "approved";
      withdrawal.adminNote = adminNote || "Payout processed successfully";
      await withdrawal.save();

      // Find original pending transaction and complete it
      await WalletTransaction.findOneAndUpdate(
        { referenceId: withdrawalId },
        { status: "completed", description: `Payout processed successfully` }
      );
    } else if (status === "rejected") {
      withdrawal.status = "rejected";
      withdrawal.adminNote = adminNote || "Payout request rejected";
      await withdrawal.save();

      // Revert the money back to the rider's wallet
      const riderWallet = await Wallet.findOne({ user: withdrawal.userId });
      if (riderWallet) {
        riderWallet.balance += withdrawal.amount;
        await riderWallet.save();

        // Mark the original pending transaction as failed
        await WalletTransaction.findOneAndUpdate(
          { referenceId: withdrawalId },
          { status: "failed", description: `Payout request rejected - Refunded to wallet` }
        );

        // Add a refund transaction for auditing clarity
        const refundTransaction = new WalletTransaction({
          walletId: riderWallet._id,
          type: "credit",
          amount: withdrawal.amount,
          description: `Refund: Reversal of rejected payout (ID: ${withdrawalId})`,
          status: "completed",
          referenceId: withdrawalId,
        });
        await refundTransaction.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: `Withdrawal request ${status} successfully`,
      withdrawal,
    }, { status: 200 });
  } catch (error: any) {
    console.error("PUT /api/admin/payouts error:", error);
    return NextResponse.json(
      { message: `Error processing payout: ${error.message}` },
      { status: 500 }
    );
  }
}
