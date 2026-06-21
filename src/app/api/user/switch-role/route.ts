// API to switch user's current role
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
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

    if (!role || !["user", "deliveryBoy", "admin", "storeManager"].includes(role)) {
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

    // Security Verification Check for Store Manager and Delivery Partner
    if (role === "storeManager" || role === "deliveryBoy") {
      // 1. Verify OTP
      if (!user.isRoleOtpVerified) {
        return NextResponse.json(
          { 
            success: false, 
            code: "OTP_REQUIRED", 
            message: "Verification OTP required before role switch." 
          },
          { status: 403 },
        );
      }

      // 2. Verify KYC approval
      if (role === "deliveryBoy") {
        let partner = await DeliveryPartner.findOne({ user: user._id });
        if (!partner) {
          // Auto-create DeliveryPartner profile as not_submitted
          partner = await DeliveryPartner.create({
            user: user._id,
            isOnline: false,
            stats: { totalDeliveries: 0, cancelledDeliveries: 0, acceptanceRate: 0, averageRating: 0 },
            earnings: { total: 0, pendingPayout: 0, currentSession: 0 },
            kyc: { status: "not_submitted", documents: [] }
          });
        }
        if (partner.kyc?.status !== "approved") {
          return NextResponse.json(
            { 
              success: false, 
              code: "KYC_REQUIRED", 
              message: "Approved KYC documents required before delivery role activation.",
              status: partner.kyc?.status || "not_submitted"
            },
            { status: 403 },
          );
        }
      } else if (role === "storeManager") {
        if (user.kyc?.status !== "approved") {
          return NextResponse.json(
            { 
              success: false, 
              code: "KYC_REQUIRED", 
              message: "Approved KYC documents required before store manager activation.",
              status: user.kyc?.status || "not_submitted"
            },
            { status: 403 },
          );
        }
      }
    }

    // Update current role and reset otp verification flag
    user.currentRole = role;
    if (role === "storeManager" || role === "deliveryBoy") {
      user.isRoleOtpVerified = false; // reset for security so they must verify next time they switch back
    }
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
