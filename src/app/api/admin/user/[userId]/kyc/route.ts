import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.currentRole !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const { userId } = await params;
    const { action, rejectionReason } = await req.json();

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!user.kyc || user.kyc.status === "not_submitted") {
      return NextResponse.json({ message: "No KYC submission found" }, { status: 400 });
    }

    if (action === "approve") {
      user.kyc.status = "approved";
      user.kyc.reviewedAt = new Date();
      user.kyc.rejectionReason = undefined;

      // Also ensure storeManager is in the user's roles array!
      if (!user.roles) {
        user.roles = ["user"];
      }
      if (!user.roles.includes("storeManager")) {
        user.roles.push("storeManager");
      }
      // If they requested a role change, resolve it
      if (user.roleChangeRequest === "pending" && user.requestedRole === "storeManager") {
        user.roleChangeRequest = "none";
        user.requestedRole = undefined;
      }
    }

    if (action === "reject") {
      if (!rejectionReason) {
        return NextResponse.json({ message: "Rejection reason is required" }, { status: 400 });
      }
      user.kyc.status = "rejected";
      user.kyc.reviewedAt = new Date();
      user.kyc.rejectionReason = rejectionReason;
    }

    await user.save();

    return NextResponse.json({ success: true, kyc: user.kyc });
  } catch (error: any) {
    console.error("Error updating user KYC:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to update KYC" },
      { status: 500 },
    );
  }
}
