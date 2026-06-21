import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { User } from "@/models/user.model";
import { isDeliveryPartner } from "@/lib/server/roles";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await connectDb();

    const user = await User.findById(session.user.id).select("name email mobileNumber kyc").lean();
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const partner = await DeliveryPartner.findOne({ user: session.user.id })
      .select("vehicleType payoutDetails kyc")
      .lean();

    return NextResponse.json({
      success: true,
      profile: {
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber || "",
        vehicleType: partner?.vehicleType || "bicycle",
        payoutDetails: partner?.payoutDetails || {
          type: "upi",
          upiId: "",
          bankName: "",
          accountNumber: "",
          ifscCode: "",
          holderName: "",
        },
        kycStatus: partner?.kyc?.status || user.kyc?.status || "not_submitted",
      },
    });
  } catch (error: any) {
    console.error("GET /api/delivery-boy/profile error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, mobileNumber, vehicleType, payoutDetails } = body;

    await connectDb();

    // 1. Update User fields
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }
    if (mobileNumber && mobileNumber.trim()) {
      user.mobileNumber = mobileNumber.trim();
    }
    await user.save();

    // 2. Update DeliveryPartner fields
    let partner = await DeliveryPartner.findOne({ user: session.user.id });
    if (!partner) {
      partner = new DeliveryPartner({
        user: session.user.id,
        isOnline: false,
        stats: { totalDeliveries: 0, cancelledDeliveries: 0, acceptanceRate: 0, averageRating: 5 },
        earnings: { total: 0, pendingPayout: 0, currentSession: 0, cashInHand: 0 },
      });
    }

    if (vehicleType) {
      partner.vehicleType = vehicleType;
    }

    if (payoutDetails) {
      partner.payoutDetails = {
        type: payoutDetails.type || "upi",
        upiId: payoutDetails.upiId || "",
        bankName: payoutDetails.bankName || "",
        accountNumber: payoutDetails.accountNumber || "",
        ifscCode: payoutDetails.ifscCode || "",
        holderName: payoutDetails.holderName || "",
      };
    }

    await partner.save();

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber || "",
        vehicleType: partner.vehicleType,
        payoutDetails: partner.payoutDetails,
        kycStatus: partner.kyc?.status || user.kyc?.status || "not_submitted",
      },
    });
  } catch (error: any) {
    console.error("PUT /api/delivery-boy/profile error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
