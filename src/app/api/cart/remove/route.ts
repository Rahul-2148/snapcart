// src/app/api/cart/remove/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";

export async function DELETE(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 }
      );
    }

    const { cartItemId } = await req.json();
    if (!cartItemId) {
      return NextResponse.json(
        { success: false, message: "Cart item id required" },
        { status: 400 }
      );
    }

    const cart = await Cart.findOne({ user: session.user.id });
    if (!cart) {
      return NextResponse.json({
        success: true,
        cartId: null,
        items: [],
      });
    }

    await CartItem.findOneAndDelete({
      _id: cartItemId,
      cart: cart._id,
    });

    const updatedItems = await CartItem.find({ cart: cart._id }).populate({
      path: "variant",
      populate: "grocery",
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
