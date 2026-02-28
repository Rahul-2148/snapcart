import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { ChatSession } from "@/models/chatSession.model";

export const dynamic = "force-dynamic";

type PatchBody = {
  title?: string;
  pinned?: boolean;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return NextResponse.json({ success: false, message: "Invalid session id" }, { status: 400 });
    }

    const body = (await request.json()) as PatchBody;
    const hasTitle = typeof body.title === "string";
    const hasPinned = typeof body.pinned === "boolean";

    if (!hasTitle && !hasPinned) {
      return NextResponse.json(
        { success: false, message: "At least one field is required" },
        { status: 400 },
      );
    }

    const updateData: { title?: string; pinned?: boolean } = {};

    if (hasTitle) {
      const nextTitle = body.title?.trim() || "Untitled chat";
      if (nextTitle.length > 140) {
        return NextResponse.json(
          { success: false, message: "Title cannot exceed 140 characters" },
          { status: 400 },
        );
      }
      updateData.title = nextTitle;
    }

    if (hasPinned) {
      updateData.pinned = body.pinned;
    }

    await connectDb();

    const updated = await ChatSession.findOneAndUpdate(
      {
        _id: sessionId,
        userId: session.user.id,
      },
      {
        $set: updateData,
      },
      {
        new: true,
      },
    )
      .select("title pinned updatedAt")
      .lean<{ _id: string; title?: string; pinned?: boolean; updatedAt: Date } | null>();

    if (!updated) {
      return NextResponse.json({ success: false, message: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: String(updated._id),
        title: updated.title || "Untitled chat",
        pinned: Boolean(updated.pinned),
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update session";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
