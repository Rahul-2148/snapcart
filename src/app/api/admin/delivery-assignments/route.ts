import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import {
  broadcastOrderToPartners,
  getOrCreateDeliverySettings,
} from "@/lib/server/delivery";

export const GET = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id || session.user.currentRole !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "broadcasted";

  const assignments = await DeliveryAssignment.find({ status })
    .populate("order", "orderNumber orderStatus")
    .populate("assignedTo", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ success: true, assignments });
};

export const POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id || session.user.currentRole !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { assignmentId, action } = await req.json();

  await connectDb();
  const assignment = await DeliveryAssignment.findById(assignmentId);
  if (!assignment) {
    return NextResponse.json(
      { message: "Assignment not found" },
      { status: 404 },
    );
  }

  if (action === "rebroadcast" && assignment.status === "broadcasted") {
    try {
      const settings = await getOrCreateDeliverySettings();
      assignment.expiresAt = new Date(
        Date.now() + (settings.assignmentExpiryMinutes || 6) * 60 * 1000,
      );
      await assignment.save();
      await broadcastOrderToPartners(assignmentId);
      return NextResponse.json({
        success: true,
        message: "Assignment re-broadcasted successfully",
      });
    } catch (error: any) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ message: "Invalid action" }, { status: 400 });
};
