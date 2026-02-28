import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryPartner } from "@/models/deliveryPartner.model";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.currentRole !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const { id } = await params;
    const { action, rejectionReason } = await req.json();

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    const partner = await DeliveryPartner.findOne({ user: id });
    if (!partner) {
      return NextResponse.json({ message: "Partner profile missing" }, { status: 404 });
    }

    if (!partner.kyc || partner.kyc.status === "not_submitted") {
      return NextResponse.json({ message: "No KYC submission found" }, { status: 400 });
    }

    if (action === "approve") {
      partner.kyc.status = "approved";
      partner.kyc.reviewedAt = new Date();
      partner.kyc.reviewedBy = session.user.id as any;
      partner.kyc.rejectionReason = undefined;
    }

    if (action === "reject") {
      if (!rejectionReason) {
        return NextResponse.json({ message: "Rejection reason is required" }, { status: 400 });
      }
      partner.kyc.status = "rejected";
      partner.kyc.reviewedAt = new Date();
      partner.kyc.reviewedBy = session.user.id as any;
      partner.kyc.rejectionReason = rejectionReason;
    }

    await partner.save();

    return NextResponse.json({ success: true, kyc: partner.kyc });
  } catch (error: any) {
    console.error("Error updating KYC:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to update KYC" },
      { status: 500 },
    );
  }
}
