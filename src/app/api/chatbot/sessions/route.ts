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

    const filter: {
      userId: string;
      $or?: Array<Record<string, unknown>>;
    } = {
      userId: session.user.id,
    };

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
      .select("title pinned updatedAt")
      .lean<ChatSessionListItem[]>();

    return NextResponse.json({
      success: true,
      sessions: sessions.map((item) => ({
        id: String(item._id),
        title: item.title || "Untitled chat",
        pinned: Boolean(item.pinned),
        updatedAt: item.updatedAt,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch sessions";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
