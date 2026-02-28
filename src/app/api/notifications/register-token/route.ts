import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { DeliveryPartner } from "@/models/deliveryPartner.model";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fcmToken } = await req.json();

    if (!fcmToken) {
      return NextResponse.json(
        { error: "FCM token is required" },
        { status: 400 },
      );
    }

    await connectDb();

    // Update user's FCM token
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Store FCM token in user model
    user.fcmToken = fcmToken;
    await user.save();

    // If delivery partner, also update their profile
    if (user.currentRole === "deliveryBoy") {
      const partner = await DeliveryPartner.findOne({ user: session.user.id });
      if (partner) {
        partner.fcmToken = fcmToken;
        await partner.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: "FCM token registered successfully",
    });
  } catch (error: any) {
    console.error("Error registering FCM token:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

// Get user's FCM token
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const user = await User.findById(session.user.id).select("fcmToken");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      fcmToken: user.fcmToken || null,
    });
  } catch (error: any) {
    console.error("Error fetching FCM token:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

// Delete FCM token (logout)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    user.fcmToken = undefined;
    await user.save();

    // Also remove from delivery partner if applicable
    if (user.currentRole === "deliveryBoy") {
      const partner = await DeliveryPartner.findOne({ user: session.user.id });
      if (partner) {
        partner.fcmToken = undefined;
        await partner.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: "FCM token removed successfully",
    });
  } catch (error: any) {
    console.error("Error removing FCM token:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
