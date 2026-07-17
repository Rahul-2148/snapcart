// src/app/api/cart/group/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { GroupCart } from "@/models/groupCart.model";
import { v4 as uuidv4 } from "uuid";

// Generate unique 6-character code
async function generateUniqueCode(): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  let isUnique = false;

  while (!isUnique) {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Check DB
    const existing = await GroupCart.findOne({ code, isActive: true });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Login required to host group ordering" },
        { status: 401 }
      );
    }

    const { hostName } = await req.json();
    if (!hostName || !hostName.trim()) {
      return NextResponse.json(
        { success: false, message: "Host name is required" },
        { status: 400 }
      );
    }

    // 1. Deactivate any previously active group carts for this host
    await GroupCart.updateMany(
      { host: session.user.id, isActive: true },
      { $set: { isActive: false } }
    );

    // 2. Generate new unique code
    const code = await generateUniqueCode();
    const hostMemberId = uuidv4();

    // 3. Create active group cart session
    const groupCart = await GroupCart.create({
      host: session.user.id,
      code,
      isActive: true,
      members: [
        {
          memberId: hostMemberId,
          name: hostName.trim(),
          joinedAt: new Date(),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Group order session started successfully",
      groupCart: {
        _id: groupCart._id,
        code: groupCart.code,
        host: groupCart.host,
        isActive: groupCart.isActive,
        members: groupCart.members,
      },
      memberId: hostMemberId,
      memberName: hostName.trim(),
    });
  } catch (error: any) {
    console.error("Create group cart error:", error);
    return NextResponse.json(
      { success: false, message: `Failed to create group cart: ${error.message}` },
      { status: 500 }
    );
  }
}
