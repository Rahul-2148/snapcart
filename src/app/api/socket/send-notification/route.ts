import { NextRequest, NextResponse } from "next/server";
import { sendNotification } from "@/lib/server/socket";

export async function POST(req: NextRequest) {
  try {
    const { userId, notification } = await req.json();

    if (!userId || !notification) {
      return NextResponse.json({ message: "Missing userId or notification" }, { status: 400 });
    }

    await sendNotification(userId, notification);

    return NextResponse.json({ message: "Notification sent successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error sending notification via API:", error);
    return NextResponse.json(
      { message: `Error sending notification: ${error.message}` },
      { status: 500 }
    );
  }
}
