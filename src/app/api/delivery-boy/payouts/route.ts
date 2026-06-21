import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/walletTransaction.model";
import Withdrawal from "@/models/withdrawal.model";

// GET: Fetch delivery-boy's payout history and current wallet balance
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== "delivery-boy") {
      return NextResponse.json({ message: "Forbidden: Rider role required" }, { status: 403 });
    }

    // Find or create wallet for rider
    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = new Wallet({
        user: user._id,
        role: "delivery-boy",
        balance: 0,
      });
      await wallet.save();
    }

    // Fetch withdrawals log
    const withdrawals = await Withdrawal.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      balance: wallet.balance,
      withdrawals,
    }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/delivery-boy/payouts error:", error);
    return NextResponse.json(
      { message: `Error fetching payouts: ${error.message}` },
      { status: 500 }
    );
  }
}

// POST: Request a withdrawal (debits wallet and creates pending payout request)
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { amount, paymentDetails } = await req.json();
    if (!amount || amount <= 0) {
      return NextResponse.json({ message: "Amount must be a positive number" }, { status: 400 });
    }

    if (!paymentDetails || !paymentDetails.type) {
      return NextResponse.json({ message: "Payment details with type are required" }, { status: 400 });
    }

    if (paymentDetails.type === "upi" && !paymentDetails.upiId) {
      return NextResponse.json({ message: "UPI ID is required for UPI payout" }, { status: 400 });
    }

    if (paymentDetails.type === "bank" && (!paymentDetails.accountNumber || !paymentDetails.ifscCode || !paymentDetails.holderName)) {
      return NextResponse.json({ message: "Account number, IFSC code, and Holder Name are required for bank payout" }, { status: 400 });
    }

    await connectDb();

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== "delivery-boy") {
      return NextResponse.json({ message: "Forbidden: Rider role required" }, { status: 403 });
    }

    // Get current wallet
    const wallet = await Wallet.findOne({ user: user._id });
    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ message: "Insufficient wallet balance" }, { status: 400 });
    }

    // Deduct from wallet balance
    wallet.balance -= amount;
    await wallet.save();

    // Create withdrawal request
    const withdrawal = new Withdrawal({
      userId: user._id,
      amount,
      paymentDetails,
      status: "pending",
    });
    await withdrawal.save();

    // Log the transaction
    const transaction = new WalletTransaction({
      walletId: wallet._id,
      type: "debit",
      amount,
      description: `Payout Withdrawal Request (Pending approval)`,
      status: "pending",
      referenceId: withdrawal._id.toString(),
    });
    await transaction.save();

    return NextResponse.json({
      success: true,
      message: "Payout withdrawal request submitted successfully",
      withdrawal,
      balance: wallet.balance,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/delivery-boy/payouts error:", error);
    return NextResponse.json(
      { message: `Error submitting payout request: ${error.message}` },
      { status: 500 }
    );
  }
}
