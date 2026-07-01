import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { ChatSession } from "@/models/chatSession.model";

export const dynamic = "force-dynamic";

type PatchBody = {
  title?: string;
  pinned?: boolean;
  archived?: boolean;
  isFavorite?: boolean;
  folderId?: string | null;
  category?: string | null;
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
    
    const updateData: Record<string, any> = {};
    if (typeof body.title === "string") {
      const nextTitle = body.title.trim() || "Untitled chat";
      if (nextTitle.length > 140) {
        return NextResponse.json(
          { success: false, message: "Title cannot exceed 140 characters" },
          { status: 400 },
        );
      }
      updateData.title = nextTitle;
    }
    if (typeof body.pinned === "boolean") {
      updateData.pinned = body.pinned;
    }
    if (typeof body.archived === "boolean") {
      updateData.archived = body.archived;
    }
    if (typeof body.isFavorite === "boolean") {
      updateData.isFavorite = body.isFavorite;
    }
    if (body.folderId !== undefined) {
      updateData.folderId = body.folderId;
    }
    if (body.category !== undefined) {
      updateData.category = body.category;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one field to update is required" },
        { status: 400 },
      );
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
      .select("title pinned archived isFavorite folderId category updatedAt")
      .lean<{
        _id: string;
        title?: string;
        pinned?: boolean;
        archived?: boolean;
        isFavorite?: boolean;
        folderId?: string;
        category?: string;
        updatedAt: Date;
      } | null>();

    if (!updated) {
      return NextResponse.json({ success: false, message: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: String(updated._id),
        title: updated.title || "Untitled chat",
        pinned: Boolean(updated.pinned),
        archived: Boolean(updated.archived),
        isFavorite: Boolean(updated.isFavorite),
        folderId: updated.folderId || null,
        category: updated.category || null,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update session";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
