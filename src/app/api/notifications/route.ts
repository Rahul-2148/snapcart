import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import Notification from "@/models/notification.model";
import dbConnect from "@/lib/server/db";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {
        const notifications = await Notification.find({ recipient: session.user.id })
            .sort({ createdAt: -1 })
            .lean(); // Use lean() for faster retrieval if not modifying

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json(
            { message: "Error fetching notifications" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    // Only allow admin or internal calls to create notifications via POST directly
    // For general use, notifications will be triggered by other events and created internally
    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {
        const { recipient, message, type, link } = await req.json();

        if (!recipient || !message || !type) {
            return NextResponse.json(
                { message: "Missing required fields: recipient, message, type" },
                { status: 400 }
            );
        }

        const newNotification = await Notification.create({
            recipient,
            message,
            type,
            link,
            read: false,
        });

        // TODO: Emit via Socket.io

        return NextResponse.json(newNotification, { status: 201 });
    } catch (error) {
        console.error("Error creating notification:", error);
        return NextResponse.json(
            { message: "Error creating notification" },
            { status: 500 }
        );
    }
}