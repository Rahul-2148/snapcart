import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { broadcastOrderToPartners } from "@/lib/server/delivery";

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id || session.user.currentRole !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const assignment = await DeliveryAssignment.findById(id);
  if (!assignment || assignment.status !== "broadcasted") {
    return NextResponse.json(
      { message: "Cannot re-broadcast this assignment" },
      { status: 400 },
    );
  }

  try {
    const result = await broadcastOrderToPartners(id);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
};
