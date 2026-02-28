import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/server/db";
import { User } from "@/models/user.model";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.currentRole !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await dbConnect();

    const { blocked } = await req.json();
    const { id: partnerId } = await params;

    // Find user and verify they have deliveryBoy role
    const user = await User.findById(partnerId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    if (!user.roles?.includes("deliveryBoy")) {
      return NextResponse.json(
        { success: false, message: "User is not a delivery partner" },
        { status: 400 },
      );
    }

    // Update blocked status
    user.isBlocked = blocked;
    await user.save();

    return NextResponse.json({
      success: true,
      message: blocked
        ? "Delivery partner blocked successfully"
        : "Delivery partner unblocked successfully",
      isBlocked: user.isBlocked,
    });
  } catch (error) {
    console.error("Error updating partner block status:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
