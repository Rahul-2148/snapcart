// src/app/api/cart/remove/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { GroupCart } from "@/models/groupCart.model";

export async function DELETE(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();

    const { cartItemId, groupCode, memberId } = await req.json();
    if (!cartItemId) {
      return NextResponse.json(
        { success: false, message: "Cart item id required" },
        { status: 400 }
      );
    }

    const cartItem = await CartItem.findById(cartItemId);
    if (!cartItem) {
      return NextResponse.json(
        { success: false, message: "Cart item not found" },
        { status: 404 }
      );
    }

    const cart = await Cart.findById(cartItem.cart);
    if (!cart) {
      return NextResponse.json({
        success: true,
        cartId: null,
        items: [],
      });
    }

    /* ================= PERMISSION CHECK ================= */
    let isAuthorized = false;

    // 1. Host owns the cart
    if (session?.user?.id && cart.user.toString() === session.user.id) {
      isAuthorized = true;
    }

    // 2. Guest or host in group session
    if (!isAuthorized && groupCode && memberId) {
      const groupSession = await GroupCart.findOne({
        code: groupCode.trim().toUpperCase(),
        isActive: true,
      });

      if (groupSession) {
        if (session?.user?.id && groupSession.host.toString() === session.user.id) {
          isAuthorized = true;
        } else {
          const isMember = groupSession.members.some((m: any) => m.memberId === memberId);
          const itemOwnerMemberId = cartItem.addedBy?.memberId;
          
          if (isMember && itemOwnerMemberId === memberId) {
            isAuthorized = true;
          }
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: You are not allowed to remove this item" },
        { status: 401 }
      );
    }

    await CartItem.findByIdAndDelete(cartItemId);

    const updatedItems = await CartItem.find({ cart: cart._id }).populate({
      path: "variant",
      populate: {
        path: "grocery",
        populate: { path: "category", select: "name" },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Item removed from cart",
      cartId: cart._id,
      items: updatedItems,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: `Remove item error: ${error.message}` },
      { status: 500 }
    );
  }
}
