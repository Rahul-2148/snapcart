import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import Notification from "@/models/notification.model";
import dbConnect from "@/lib/server/db";
import mongoose from "mongoose";

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> | { id: string } }
) {
    // Await context.params to resolve the actual params object
    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {


        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error("Invalid notification ID format:", id);
            return NextResponse.json(
                { message: "Invalid notification ID format" },
                { status: 400 }
            );
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(id), recipient: session.user.id },
            { read: true },
            { new: true }
        );



        if (!notification) {
            return NextResponse.json(
                { message: "Notification not found or not authorized" },
                { status: 404 }
            );
        }

        return NextResponse.json(notification);
    } catch (error) {
        console.error("Error marking notification as read:", error);
        return NextResponse.json(
            { message: "Error marking notification as read" },
            { status: 500 }
        );
    }
}