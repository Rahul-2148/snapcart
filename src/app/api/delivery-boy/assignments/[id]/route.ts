import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { isDeliveryPartner } from "@/lib/server/roles";

export const GET = async (
  _req: Request,
  { params }: { params: { id: string } },
) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isDeliveryPartner(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDb();
  const assignment = await DeliveryAssignment.findOne({
    _id: params.id,
    $or: [
      { assignedTo: session.user.id },
      { broadcastedTo: { $in: [session.user.id] } },
    ],
  })
    .lean();

  if (!assignment) {
    return NextResponse.json({ message: "Assignment not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, assignment });
};
