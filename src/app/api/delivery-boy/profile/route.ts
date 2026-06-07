import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { isDeliveryPartner } from "@/lib/server/roles";

export const dynamic = "force-dynamic";

export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!(await isDeliveryPartner(session))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDb();
  const partner = await DeliveryPartner.findOne({ user: session.user.id })
    .populate("user", "name email mobileNumber role")
    .lean();

  if (!partner) {
    return NextResponse.json({ message: "Partner profile missing" }, { status: 404 });
  }

  return NextResponse.json({ 
    success: true, 
    partner: {
      ...partner,
      gender: partner.gender || null,
    }
  });
};

export const PUT = async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, phone, gender, profileImage } = body;

    await connectDb();

    const partner = await DeliveryPartner.findOneAndUpdate(
      { user: session.user.id },
      {
        gender: gender || null,
        profileImage,
      },
      { new: true }
    )
      .populate("user", "name email mobileNumber role")
      .lean();

    if (!partner) {
      return NextResponse.json({ message: "Partner profile missing" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: "Profile updated successfully",
      partner: {
        ...partner,
        gender: partner.gender || null,
      }
    });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Internal server error" 
    }, { status: 500 });
  }
};
