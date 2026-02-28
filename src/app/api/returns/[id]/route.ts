// src/app/api/returns/[id]/route.ts
import { auth } from "@/auth";
import { ReturnRequest } from "@/models/returnRequest.model";
import connectDb from "@/lib/server/db";
import { NextRequest, NextResponse } from "next/server";
import getSocketClient from "@/lib/server/socket";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const { id } = await params;
    const returnRequest = await ReturnRequest.findById(id)
      .populate("order")
      .populate("orderItem")
      .populate("grocery")
      .populate("user");

    if (!returnRequest) {
      return NextResponse.json(
        { error: "Return request not found" },
        { status: 404 },
      );
    }

    // Check authorization
    if (returnRequest.user._id.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(returnRequest);
  } catch (error) {
    console.error("Get return details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch return details" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const { id } = await params;
    const returnRequest = await ReturnRequest.findById(id);
    if (!returnRequest) {
      return NextResponse.json(
        { error: "Return request not found" },
        { status: 404 },
      );
    }

    // Check authorization
    if (returnRequest.user.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updates = await req.json();

    // Users can only cancel if status is pending
    if (updates.status === "cancelled") {
      if (returnRequest.status !== "pending") {
        return NextResponse.json(
          { error: "Can only cancel pending return requests" },
          { status: 400 },
        );
      }
    }

    // Update only allowed fields
    const allowedUpdates = ["description", "images", "status"];
    const updateData: any = {};

    allowedUpdates.forEach((key) => {
      if (key in updates) {
        updateData[key] = updates[key];
      }
    });

    const updated = await ReturnRequest.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate(["order", "orderItem", "user", "grocery"]);

    // Emit real-time notification to admin
    try {
      const ioClient = getSocketClient();
      const eventType =
        updates.status === "cancelled" ? "return:cancelled" : "return:updated";
      (ioClient as any).emit(eventType, {
        returnId: id,
        status: updated.status,
        updatedData: updateData,
        updatedAt: new Date(),
        data: updated,
      });
    } catch (error) {
      console.error("Error emitting socket event:", error);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update return error:", error);
    return NextResponse.json(
      { error: "Failed to update return request" },
      { status: 500 },
    );
  }
}
