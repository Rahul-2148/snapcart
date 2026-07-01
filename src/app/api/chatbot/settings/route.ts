import { NextResponse } from "next/server";

import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { UserChatbotSettings } from "@/models/userChatbotSettings.model";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    let settings = await UserChatbotSettings.findOne({ userId: session.user.id });
    if (!settings) {
      // Create default settings for user
      settings = await UserChatbotSettings.create({ userId: session.user.id });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch settings";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    await connectDb();

    // Remove immutable fields if any
    delete body.userId;
    delete body._id;
    delete body.createdAt;
    delete body.updatedAt;

    const settings = await UserChatbotSettings.findOneAndUpdate(
      { userId: session.user.id },
      { $set: body },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    // Reset settings by deleting and recreating
    await UserChatbotSettings.deleteOne({ userId: session.user.id });
    const settings = await UserChatbotSettings.create({ userId: session.user.id });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reset settings";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
