// src/app/api/cart/group/exit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { GroupCart } from "@/models/groupCart.model";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    const { code, memberId, action } = await req.json();

    if (!code) {
      return NextResponse.json(
        { success: false, message: "Group session code is required" },
        { status: 400 }
      );
    }

    const groupSession = await GroupCart.findOne({
      code: code.trim().toUpperCase(),
      isActive: true,
    });

    if (!groupSession) {
      return NextResponse.json(
        { success: false, message: "Active group session not found" },
        { status: 404 }
      );
    }

    const isHost = session?.user?.id && groupSession.host.toString() === session.user.id;

    if (action === "terminate") {
      // 1. Host wants to end the group session
      if (!isHost) {
        return NextResponse.json(
          { success: false, message: "Unauthorized: Only the host can terminate the session" },
          { status: 403 }
        );
      }
      groupSession.isActive = false;
      await groupSession.save();

      // Optionally keep or clear host's cart. We keep host items but remove guest metadata
      const hostCart = await Cart.findOne({ user: groupSession.host });
      if (hostCart) {
        // Delete all items added by guest members
        await CartItem.deleteMany({
          cart: hostCart._id,
          "addedBy.memberId": { $exists: true, $ne: null },
        });
        
        // Remove metadata from host items
        await CartItem.updateMany(
          { cart: hostCart._id },
          { $unset: { addedBy: "" } }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Group ordering session terminated by host",
      });
    }

    // 2. Member leaves or host kicks member
    const targetMemberId = memberId;
    if (!targetMemberId) {
      return NextResponse.json(
        { success: false, message: "Member ID is required" },
        { status: 400 }
      );
    }

    const memberIndex = groupSession.members.findIndex((m: any) => m.memberId === targetMemberId);
    if (memberIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Member not found in session" },
        { status: 404 }
      );
    }

    const isTargetingSelf = !isHost && memberId === targetMemberId;
    const isAllowed = isHost || isTargetingSelf;

    if (!isAllowed) {
      return NextResponse.json(
        { success: false, message: "Unauthorized action" },
        { status: 403 }
      );
    }

    const memberName = groupSession.members[memberIndex].name;
    
    // Remove member from session
    groupSession.members.splice(memberIndex, 1);
    await groupSession.save();

    // Clean up items added by this member in host's cart
    const hostCart = await Cart.findOne({ user: groupSession.host });
    if (hostCart) {
      await CartItem.deleteMany({
        cart: hostCart._id,
        "addedBy.memberId": targetMemberId,
      });
    }

    return NextResponse.json({
      success: true,
      message: isHost ? `${memberName} removed from group` : "Successfully left the group order",
      groupCart: {
        _id: groupSession._id,
        code: groupSession.code,
        host: groupSession.host,
        isActive: groupSession.isActive,
        members: groupSession.members,
      },
    });
  } catch (error: any) {
    console.error("Exit group cart error:", error);
    return NextResponse.json(
      { success: false, message: `Failed to exit group: ${error.message}` },
      { status: 500 }
    );
  }
}
