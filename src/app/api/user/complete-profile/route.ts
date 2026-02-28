// API to complete Google user profile with role and mobile
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

    const { role, mobileNumber, gender } = await req.json();

    console.log("📝 Complete Profile Request:", {
      email: session.user.email,
      role,
      mobileNumber,
    });

    // Validate role
    if (!role || !["user", "deliveryBoy"].includes(role)) {
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

    // Update user with role and mobile
    let updatedRoles = ["user"];
    let updatedCurrentRole = "user";

    if (role === "deliveryBoy") {
      updatedRoles = ["user", "deliveryBoy"];
      updatedCurrentRole = "deliveryBoy";
    }

    user.roles = updatedRoles;
    user.currentRole = updatedCurrentRole;
    user.profileCompleted = true; // Mark profile as completed
    if (mobileNumber) {
      user.mobileNumber = mobileNumber;
    }
    if (gender) {
      user.gender = gender;
    }

    await user.save();

    console.log("✅ Profile updated:", {
      id: user._id,
      roles: user.roles,
      currentRole: user.currentRole,
      mobileNumber: user.mobileNumber,
      profileCompleted: user.profileCompleted,
    });

    return NextResponse.json({
      success: true,
      message: "Profile completed successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        currentRole: user.currentRole,
        mobileNumber: user.mobileNumber,
      },
    });
  } catch (error: any) {
    console.error("Complete profile error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
