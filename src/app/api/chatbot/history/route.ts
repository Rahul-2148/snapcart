import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { ChatSession } from "@/models/chatSession.model";

export const dynamic = "force-dynamic";

type ChatSessionLean = {
  _id: string;
  role: "user" | "deliveryBoy" | "admin";
  messages: {
    role: "user" | "assistant";
    content: string;
    createdAt?: Date;
  }[];
  updatedAt: Date;
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId")?.trim();
    const mode = url.searchParams.get("mode")?.trim() || "agent";

    let queryObj: any = { userId: session.user.id };
    if (sessionId) {
      queryObj._id = sessionId;
    } else {
      if (mode === "agent") {
        queryObj.mode = { $in: ["agent", null, undefined] };
      } else {
        queryObj.mode = mode;
      }
    }

    const chatSession = await ChatSession.findOne(queryObj)
      .sort({ updatedAt: -1 })
      .select("messages role updatedAt")
      .lean<ChatSessionLean>();

    return NextResponse.json({
      success: true,
      session: chatSession
        ? {
            id: String(chatSession._id),
            role: chatSession.role,
            messages: chatSession.messages || [],
            updatedAt: chatSession.updatedAt,
          }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch chat history";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId")?.trim();

    if (sessionId) {
      await ChatSession.deleteOne({ _id: sessionId, userId: session.user.id });
    } else {
      await ChatSession.deleteMany({ userId: session.user.id });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to clear chat history";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
