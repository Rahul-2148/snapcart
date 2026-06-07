import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { isDeliveryPartner } from "@/lib/server/roles";

export const GET = async () => {
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

  return NextResponse.json({
    success: true,
    summary: {
      totalEarnings: partner.earnings.total,
      pendingPayout: partner.earnings.pendingPayout,
      currentSessionEarnings: partner.earnings.currentSession,
      deliveryCount: partner.stats.totalDeliveries,
      tipEarnings: 0,
    },
    partner,
  });
};
