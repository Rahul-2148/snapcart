import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { isDeliveryPartner } from "@/lib/server/roles";

export const GET = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isDeliveryPartner(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDb();
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const statuses = statusParam
    ? statusParam.split(",").filter(Boolean)
    : ["assigned", "picked_up", "on_the_way"];

  const assignments = await DeliveryAssignment.find({
    assignedTo: session.user.id,
    status: { $in: statuses },
  })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ success: true, assignments });
};
