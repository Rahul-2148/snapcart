import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/walletTransaction.model";
import GiftCard from "@/models/giftCard.model";
import { sendGiftCardRedemptionEmail } from "@/lib/server/email";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { code, pin } = await req.json();
    if (!code || !pin) {
      return NextResponse.json({ message: "Gift Card Code and PIN are required" }, { status: 400 });
    }

    // Normalize card code: uppercase, trim, remove whitespace and hyphens
    const normalizedCode = code.replace(/[\s-]/g, "").toUpperCase();
    const normalizedPin = pin.trim();

    if (normalizedCode.length !== 16) {
      return NextResponse.json({ message: "Gift Card Code must be 16 digits" }, { status: 400 });
    }

    if (normalizedPin.length !== 6) {
      return NextResponse.json({ message: "PIN must be 6 digits" }, { status: 400 });
    }

    await connectDb();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find Gift Card
    const giftCard = await GiftCard.findOne({ code: normalizedCode });
    if (!giftCard) {
      return NextResponse.json({ message: "Invalid Gift Card Code" }, { status: 404 });
    }

    // Verify status
    if (giftCard.status === "redeemed") {
      return NextResponse.json({ message: "This Gift Card has already been redeemed" }, { status: 400 });
    }

    if (giftCard.status === "expired" || new Date() > new Date(giftCard.expiresAt)) {
      if (giftCard.status !== "expired") {
        giftCard.status = "expired";
        await giftCard.save();
      }
      return NextResponse.json({ message: "This Gift Card has expired" }, { status: 400 });
    }

    // Verify PIN
    if (giftCard.pin !== normalizedPin) {
      return NextResponse.json({ message: "Incorrect Gift Card PIN" }, { status: 400 });
    }

    // Redeem Gift Card
    giftCard.status = "redeemed";
    giftCard.redeemedBy = user._id;
    giftCard.redeemedAt = new Date();
    await giftCard.save();

    // Credit User's Wallet
    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = new Wallet({
        user: user._id,
        role: "user",
        balance: 0,
      });
    }

    wallet.balance += giftCard.amount;
    await wallet.save();

    // Log Wallet Transaction
    const transaction = new WalletTransaction({
      walletId: wallet._id,
      type: "credit",
      amount: giftCard.amount,
      description: `Redeemed Gift Card (Code: ****${normalizedCode.slice(-4)})`,
      status: "completed",
      referenceId: giftCard._id.toString(),
    });
    await transaction.save();

    // Send redemption email confirmation asynchronously
    try {
      await sendGiftCardRedemptionEmail(
        session.user.email,
        session.user.name || "Customer",
        {
          code: giftCard.code,
          amount: giftCard.amount,
          balance: wallet.balance,
        }
      );
    } catch (emailErr) {
      console.error("Error sending gift card redemption email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully redeemed gift card! ₹${giftCard.amount} added to your wallet.`,
      balance: wallet.balance,
      amountRedeemed: giftCard.amount,
    }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/user/gift-cards/redeem error:", error);
    return NextResponse.json(
      { message: `Error redeeming gift card: ${error.message}` },
      { status: 500 }
    );
  }
}
