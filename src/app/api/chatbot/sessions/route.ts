import { NextResponse } from "next/server";

import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { ChatSession } from "@/models/chatSession.model";

export const dynamic = "force-dynamic";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type ChatSessionListItem = {
  _id: string;
  title?: string;
  pinned?: boolean;
  archived?: boolean;
  isFavorite?: boolean;
  folderId?: string;
  category?: string;
  updatedAt: Date;
};

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const mode = searchParams.get("mode")?.trim() || "agent";
    const filterType = searchParams.get("filterType")?.trim() || "active"; // active, archived, favorites, pinned, all

    const filter: Record<string, any> = {
      userId: session.user.id,
    };

    if (mode === "agent") {
      filter.mode = { $in: ["agent", null, undefined] };
    } else {
      filter.mode = mode;
    }

    if (filterType === "active") {
      filter.archived = { $ne: true };
    } else if (filterType === "archived") {
      filter.archived = true;
    } else if (filterType === "favorites") {
      filter.isFavorite = true;
    } else if (filterType === "pinned") {
      filter.pinned = true;
    }

    if (query) {
      const safeQuery = escapeRegex(query);
      const normalizedQuery = query.toLowerCase().replace(/\s+/g, "");
      const matchesUntitled = "untitledchat".includes(normalizedQuery);
      const searchClauses: Array<Record<string, unknown>> = [
        { title: { $regex: safeQuery, $options: "i" } },
        {
          messages: {
            $elemMatch: {
              content: { $regex: safeQuery, $options: "i" },
            },
          },
        },
      ];

      if (matchesUntitled) {
        searchClauses.push({ title: { $exists: false } });
        searchClauses.push({ title: null });
        searchClauses.push({ title: "" });
      }

      filter.$or = searchClauses;
    }

    const sessions = await ChatSession.find(filter)
      .sort({ pinned: -1, updatedAt: -1 })
      .limit(50)
      .select("title pinned archived isFavorite folderId category updatedAt")
      .lean<ChatSessionListItem[]>();

    return NextResponse.json({
      success: true,
      sessions: sessions.map((item) => ({
        id: String(item._id),
        title: item.title || "Untitled chat",
        pinned: Boolean(item.pinned),
        archived: Boolean(item.archived),
        isFavorite: Boolean(item.isFavorite),
        folderId: item.folderId || null,
        category: item.category || null,
        updatedAt: item.updatedAt,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch sessions";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const duplicateFromSessionId = body.duplicateFromSessionId;
    const mode = body.mode || "agent";

    await connectDb();

    if (duplicateFromSessionId) {
      const srcSession = await ChatSession.findOne({
        _id: duplicateFromSessionId,
        userId: session.user.id,
      });

      if (!srcSession) {
        return NextResponse.json({ success: false, message: "Source session not found" }, { status: 404 });
      }

      const newSession = await ChatSession.create({
        userId: session.user.id,
        role: "user",
        title: srcSession.title ? `${srcSession.title} (Copy)` : "Untitled chat (Copy)",
        pinned: false,
        archived: false,
        isFavorite: false,
        messages: srcSession.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
        mode: srcSession.mode || mode,
      });

      return NextResponse.json({
        success: true,
        session: {
          id: String(newSession._id),
          title: newSession.title,
          pinned: false,
          archived: false,
          isFavorite: false,
          updatedAt: newSession.updatedAt,
        },
      });
    }

    // Standard session creation
    const newSession = await ChatSession.create({
      userId: session.user.id,
      role: "user",
      title: body.title || "Untitled chat",
      pinned: false,
      archived: false,
      isFavorite: false,
      messages: [],
      mode,
    });

    return NextResponse.json({
      success: true,
      session: {
        id: String(newSession._id),
        title: newSession.title,
        pinned: false,
        archived: false,
        isFavorite: false,
        updatedAt: newSession.updatedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create session";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
