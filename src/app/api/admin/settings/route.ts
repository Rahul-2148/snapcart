import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { AdminSettings as AdminSettingsModel } from "@/models/adminSettings.model";
import mongoose from "mongoose";
import { auth } from "@/auth";

interface AdminSettingsData {
  theme: "system" | "light" | "dark";
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  orderAlerts: boolean;
  autoApproveReturns: boolean;
}

// GET /api/admin/settings - Fetch admin settings
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDb();

    // @ts-ignore
    const userId = session.user.id;

    const settings = await AdminSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    return NextResponse.json({
      success: true,
      settings: settings
        ? {
            theme: settings.theme,
            notifications: settings.notifications,
            orderAlerts: settings.orderAlerts,
            autoApproveReturns: settings.autoApproveReturns,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching admin settings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/settings - Update admin settings
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDb();

    // @ts-ignore
    const userId = session.user.id;
    const body = await req.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid settings format" },
        { status: 400 },
      );
    }

    // Basic validation
    if (!["system", "light", "dark"].includes(settings.theme)) {
      return NextResponse.json(
        { success: false, message: "Invalid theme value" },
        { status: 400 },
      );
    }

    // Upsert settings document
    const updated = await AdminSettingsModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          theme: settings.theme,
          notifications: settings.notifications,
          orderAlerts: settings.orderAlerts,
          autoApproveReturns: settings.autoApproveReturns,
        },
      },
      { upsert: true, new: true },
    );

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
      settings: {
        theme: updated.theme,
        notifications: updated.notifications,
        orderAlerts: updated.orderAlerts,
        autoApproveReturns: updated.autoApproveReturns,
      },
    });
  } catch (error) {
    console.error("Error updating admin settings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update settings" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/settings - Reset admin settings to defaults
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDb();

    // @ts-ignore
    const userId = session.user.id;

    // Delete user's settings
    await AdminSettingsModel.deleteOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    return NextResponse.json({
      success: true,
      message: "Settings reset to defaults",
    });
  } catch (error) {
    console.error("Error resetting admin settings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reset settings" },
      { status: 500 },
    );
  }
}
