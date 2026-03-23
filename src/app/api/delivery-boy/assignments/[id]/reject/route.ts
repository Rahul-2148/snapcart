import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { isDeliveryPartner } from "@/lib/server/roles";

export const POST = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isDeliveryPartner(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDb();
  const assignment = await DeliveryAssignment.findOneAndUpdate(
    {
      _id: id,
      status: "broadcasted",
    },
    {
      $addToSet: { declinedBy: session.user.id },
      $pull: { broadcastedTo: session.user.id },
    },
    { new: true },
  );

  if (!assignment) {
    return NextResponse.json({ message: "Assignment not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
};
