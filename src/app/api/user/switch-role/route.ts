// API to switch user's current role
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { role } = await req.json();

    if (!role || !["user", "deliveryBoy", "admin"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Invalid role" },
        { status: 400 },
      );
    }

    // Find user by email
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    // Check if user has this role
    if (!user.roles?.includes(role)) {
      return NextResponse.json(
        { success: false, message: "You don't have access to this role" },
        { status: 403 },
      );
    }

    // Update current role
    user.currentRole = role;
    await user.save();

    console.log("✅ Role switched:", {
      email: user.email,
      newRole: role,
      availableRoles: user.roles,
    });

    return NextResponse.json({
      success: true,
      message: "Role switched successfully",
      currentRole: role,
    });
  } catch (error: any) {
    console.error("Switch role error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
