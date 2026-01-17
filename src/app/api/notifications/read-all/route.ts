import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import Notification from "@/models/notification.model";
import dbConnect from "@/lib/server/db";

export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {
        await Notification.updateMany(
            { recipient: session.user.id, read: false },
            { read: true }
        );

        return NextResponse.json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        return NextResponse.json(
            { message: "Error marking all notifications as read" },
            { status: 500 }
        );
    }
}