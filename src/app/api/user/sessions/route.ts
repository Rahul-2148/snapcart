// src/app/api/user/sessions/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Session } from "@/models/session.model";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const sessions = await Session.find({ userId: session.user.id }).sort({
      lastActiveAt: -1,
    });

    return NextResponse.json({
      sessions,
      currentSessionId: (session.user as any).sessionId,
    });
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetSessionId = searchParams.get("sessionId");
    const revokeOthers = searchParams.get("revokeOthers") === "true";

    await connectDb();

    if (targetSessionId) {
      // Security validation: verify that the target session belongs to the logged-in user
      const target = await Session.findOne({
        jti: targetSessionId,
        userId: session.user.id,
      });

      if (!target) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      await Session.deleteOne({ jti: targetSessionId });
      console.log(`🗑️ Session ${targetSessionId} revoked for user ${session.user.id}`);
      
      return NextResponse.json({
        success: true,
        message: "Session terminated successfully",
      });
    }

    if (revokeOthers) {
      const currentJti = (session.user as any).sessionId;
      if (!currentJti) {
        return NextResponse.json(
          { error: "Current session ID missing" },
          { status: 400 }
        );
      }

      // Terminate all sessions for this user EXCEPT the current active one
      const result = await Session.deleteMany({
        userId: session.user.id,
        jti: { $ne: currentJti },
      });

      console.log(`🗑️ Terminated ${result.deletedCount} other sessions for user ${session.user.id}`);

      return NextResponse.json({
        success: true,
        message: `Terminated ${result.deletedCount} other device session(s) successfully`,
      });
    }

    return NextResponse.json(
      { error: "Missing parameter: provide sessionId or revokeOthers=true" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error revoking sessions:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
