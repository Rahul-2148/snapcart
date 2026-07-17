import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { GroupCart } from "@/models/groupCart.model";

export async function DELETE(req: NextRequest) {
  try {
    await connectDb();

    // Check if groupCode is provided in query params or headers
    const { searchParams } = new URL(req.url);
    const groupCode = searchParams.get("groupCode") || req.headers.get("x-group-code");
    const memberId = searchParams.get("memberId") || req.headers.get("x-group-member-id");

    let cart;
    let isGroupCart = false;
    let groupSession = null;

    if (groupCode && groupCode.trim() !== "") {
      groupSession = await GroupCart.findOne({ code: groupCode.trim().toUpperCase(), isActive: true });
      if (!groupSession) {
        return NextResponse.json(
          { success: false, message: "Group session not found" },
          { status: 404 }
        );
      }
      cart = await Cart.findOne({ user: groupSession.host });
      isGroupCart = true;
    } else {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }
      cart = await Cart.findOne({ user: session.user.id });
    }

    if (cart) {
      if (isGroupCart && memberId) {
        const session = await auth();
        const isHost = session?.user?.id && groupSession.host.toString() === session.user.id;

        if (isHost) {
          // Host clears everything
          await CartItem.deleteMany({ cart: cart._id });
          cart.coupon = null;
          await cart.save();
        } else {
          // Guest clears only their items
          await CartItem.deleteMany({ cart: cart._id, "addedBy.memberId": memberId });
        }
      } else {
        // Normal clear
        await CartItem.deleteMany({ cart: cart._id });
        cart.coupon = null;
        await cart.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cart cleared",
      cartId: cart?._id ?? null,
      items: [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: `Clear cart error: ${error.message}` },
      { status: 500 }
    );
  }
}
