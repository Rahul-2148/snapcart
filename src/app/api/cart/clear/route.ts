// src/app/api/cart/clear/route.ts
import { NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";

export async function DELETE() {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    const cart = await Cart.findOne({ user: session.user.id });
    if (cart) {
      await CartItem.deleteMany({ cart: cart._id });
      cart.coupon = null;
      await cart.save();
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
