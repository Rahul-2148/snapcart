import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { isDeliveryPartner } from "@/lib/server/roles";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { DeliveryIncentive } from "@/models/deliveryIncentive.model";

export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isDeliveryPartner(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDb();

  const partner = await DeliveryPartner.findOne({ user: session.user.id })
    .select("stats earnings")
    .lean();

  const now = new Date();
  const incentives = await DeliveryIncentive.find({
    isActive: true,
    startAt: { $lte: now },
    endAt: { $gte: now },
  })
    .sort({ endAt: 1 })
    .lean();

  const response = incentives.map((incentive) => {
    const deliveriesDone = partner?.stats?.totalDeliveries || 0;
    const earningsDone = partner?.earnings?.currentSession || 0;
    const targetDeliveries = incentive.targetDeliveries || 0;
    const targetEarnings = incentive.targetEarnings || 0;

    const deliveryProgress = targetDeliveries
      ? Math.min(100, Math.round((deliveriesDone / targetDeliveries) * 100))
      : 0;
    const earningsProgress = targetEarnings
      ? Math.min(100, Math.round((earningsDone / targetEarnings) * 100))
      : 0;

    const progress = Math.max(deliveryProgress, earningsProgress);

    return {
      ...incentive,
      progress,
      deliveriesDone,
      earningsDone,
    };
  });

  return NextResponse.json({ success: true, incentives: response });
};
