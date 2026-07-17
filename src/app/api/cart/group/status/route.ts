// src/app/api/cart/group/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { GroupCart } from "@/models/groupCart.model";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { success: false, message: "Group session code is required" },
        { status: 400 }
      );
    }

    const groupSession = await GroupCart.findOne({
      code: code.trim().toUpperCase(),
    }).populate("host", "name");

    if (!groupSession) {
      return NextResponse.json(
        { success: false, message: "Group session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      groupCart: {
        _id: groupSession._id,
        code: groupSession.code,
        host: groupSession.host,
        isActive: groupSession.isActive,
        members: groupSession.members,
        createdAt: groupSession.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Get group cart status error:", error);
    return NextResponse.json(
      { success: false, message: `Failed to fetch group cart status: ${error.message}` },
      { status: 500 }
    );
  }
}
