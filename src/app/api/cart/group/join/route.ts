// src/app/api/cart/group/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { GroupCart } from "@/models/groupCart.model";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const { code, name } = await req.json();

    if (!code || !code.trim()) {
      return NextResponse.json(
        { success: false, message: "Invite code is required" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Your name is required to join" },
        { status: 400 }
      );
    }

    // 1. Find active group session
    const groupSession = await GroupCart.findOne({
      code: code.trim().toUpperCase(),
      isActive: true,
    }).populate("host", "name email");

    if (!groupSession) {
      return NextResponse.json(
        { success: false, message: "Active group order session not found. It may have expired or been terminated by the host." },
        { status: 404 }
      );
    }

    // 2. Add member if not already joined (check if guest/member name is already in members array, or always add as new UUID)
    const memberId = uuidv4();
    const newMember = {
      memberId,
      name: name.trim(),
      joinedAt: new Date(),
    };

    groupSession.members.push(newMember);
    await groupSession.save();

    return NextResponse.json({
      success: true,
      message: "Successfully joined the group order",
      groupCart: {
        _id: groupSession._id,
        code: groupSession.code,
        host: groupSession.host,
        isActive: groupSession.isActive,
        members: groupSession.members,
      },
      memberId,
      memberName: name.trim(),
    });
  } catch (error: any) {
    console.error("Join group cart error:", error);
    return NextResponse.json(
      { success: false, message: `Failed to join group cart: ${error.message}` },
      { status: 500 }
    );
  }
}
