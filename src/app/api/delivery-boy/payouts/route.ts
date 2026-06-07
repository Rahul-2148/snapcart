import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { isDeliveryPartner } from "@/lib/server/roles";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { Payout } from "@/models/payout.model";
import { BankAccount } from "@/models/bankAccount.model";

export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!(await isDeliveryPartner(session))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDb();

  const payouts = await Payout.find({ deliveryPartner: session.user.id })
    .sort({ createdAt: -1 })
    .limit(20);

  return NextResponse.json({ success: true, payouts });
};

export const POST = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!(await isDeliveryPartner(session))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDb();

  const partner = await DeliveryPartner.findOne({ user: session.user.id });
  if (!partner) {
    return NextResponse.json({ message: "Partner profile missing" }, { status: 404 });
  }

  const pendingPayout = partner.earnings?.pendingPayout || 0;
  if (pendingPayout <= 0) {
    return NextResponse.json({ message: "No pending payout available" }, { status: 400 });
  }

  const existingPending = await Payout.findOne({
    deliveryPartner: session.user.id,
    status: { $in: ["pending", "processing"] },
  });

  if (existingPending) {
    return NextResponse.json(
      { message: "A payout is already pending or processing" },
      { status: 400 },
    );
  }

  const primaryBank = await BankAccount.findOne({
    userId: session.user.id,
    isPrimary: true,
  });

  if (!primaryBank) {
    return NextResponse.json(
      { message: "Please add a primary bank account to request payout" },
      { status: 400 },
    );
  }

  const now = new Date();
  const periodStart = partner.earnings?.lastPayoutAt
    ? new Date(partner.earnings.lastPayoutAt)
    : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const payout = await Payout.create({
    deliveryPartner: session.user.id,
    amount: pendingPayout,
    currency: "INR",
    status: "pending",
    period: {
      startDate: periodStart,
      endDate: now,
    },
    bankDetails: {
      accountNumber: primaryBank.accountNumber,
      ifsc: primaryBank.ifsc,
      beneficiaryName: primaryBank.beneficiaryName,
    },
    deliveriesCount: partner.stats?.totalDeliveries || 0,
    earnedAmount: pendingPayout,
    deductedAmount: 0,
    notes: "Partner payout request",
  });

  partner.earnings.pendingPayout = 0;
  partner.earnings.lastPayoutAt = now;
  await partner.save();

  return NextResponse.json({ success: true, payout });
};
