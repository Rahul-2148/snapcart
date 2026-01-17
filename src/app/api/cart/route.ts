import { NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";

// FORCE model registration
import "@/models/groceryVariant.model";
import "@/models/grocery.model";

export async function GET() {
  try {
    await connectDb();
    const session = await auth();

    if (!session?.user?.id)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    const cart = await Cart.findOne({ user: session.user.id });

    if (!cart)
      return NextResponse.json({
        success: true,
        cart: null,
        items: [],
        coupon: null,
      });

    const items = await CartItem.find({ cart: cart._id }).populate({
      path: "variant",
      populate: { path: "grocery", select: "name images category" },
    });

    return NextResponse.json({
      success: true,
      cart,
      items,
      coupon: cart.coupon || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: `get cart error: ${error.message}` },
      { status: 500 }
    );
  }
}
