import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { runOrchestrator } from "@/lib/server/ai/agents/orchestrator";
import { ChatSession } from "@/models/chatSession.model";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = (body?.message || "").toString().trim();
    const sessionId = (body?.sessionId || "").toString().trim();
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ success: false, message: "Message is required" }, { status: 400 });
    }

    const session = await auth();
    let userId = session?.user?.id;
    let role = session?.user?.currentRole || "user";

    // Standard fallback mock user ID if not logged in for testing
    if (!userId) {
      userId = "000000000000000000000000"; // anonymous guest profile
      role = "user";
    }

    await connectDb();

    // Map history to simple text lines
    const historyText = history
      .slice(-6)
      .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    // Execute multi-agent orchestration
    const agentResult = await runOrchestrator({
      userId,
      sessionId,
      role,
      message,
      historyText,
    });

    let persistedSessionId = sessionId;

    // Save session logs to ChatSession model
    if (userId) {
      const nextMessages = [
        ...history.slice(-10),
        { role: "user", content: message },
        { role: "assistant", content: agentResult.reply },
      ];

      let chatSession = null;
      if (sessionId && sessionId !== "undefined" && sessionId !== "null") {
        chatSession = await ChatSession.findOneAndUpdate(
          { _id: sessionId, userId },
          { $set: { messages: nextMessages, role } },
          { new: true }
        );
      }

      if (!chatSession) {
        chatSession = await ChatSession.create({
          userId,
          role,
          title: message.slice(0, 80),
          messages: nextMessages,
        });
      }

      if (chatSession?._id) {
        persistedSessionId = chatSession._id.toString();
      }
    }

    return NextResponse.json({
      success: true,
      reply: agentResult.reply,
      actions: agentResult.actions,
      sessionId: persistedSessionId,
    });
  } catch (error: any) {
    console.error("AI chat API gateway error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
