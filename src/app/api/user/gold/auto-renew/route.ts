import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { autoRenew } = await req.json();

    if (typeof autoRenew !== "boolean") {
      return NextResponse.json(
        { success: false, message: "autoRenew parameter must be a boolean" },
        { status: 400 }
      );
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    user.goldAutoRenew = autoRenew;
    await user.save();

    return NextResponse.json({
      success: true,
      message: `Gold auto-renewal turned ${autoRenew ? "ON" : "OFF"}.`,
      goldAutoRenew: user.goldAutoRenew,
    });
  } catch (error: any) {
    console.error("Error setting gold auto-renew status:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
