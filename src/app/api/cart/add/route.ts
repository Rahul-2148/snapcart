// src/app/api/cart/add/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { GroceryVariant } from "@/models/groceryVariant.model";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 }
      );

    const { variantId, quantity = 1 } = await req.json();
    const variant = await GroceryVariant.findById(variantId).populate(
      "grocery"
    );
    if (!variant || !variant.grocery?.isActive)
      return NextResponse.json(
        { success: false, message: "Variant unavailable" },
        { status: 404 }
      );

    let cart = await Cart.findOne({ user: session.user.id });
    if (!cart) cart = await Cart.create({ user: session.user.id });

    const existingItem = await CartItem.findOne({
      cart: cart._id,
      variant: variantId,
    });
    const currentQty = existingItem?.quantity ?? 0;
    if (currentQty + quantity > variant.countInStock)
      return NextResponse.json(
        {
          success: false,
          message: `Only ${variant.countInStock} items available`,
        },
        { status: 400 }
      );

    await CartItem.findOneAndUpdate(
      { cart: cart._id, variant: variantId },
      {
        $inc: { quantity },
        $setOnInsert: {
          priceAtAdd: {
            mrp: variant.price.mrp,
            selling: variant.price.selling,
          },
        },
      },
      { upsert: true, new: true }
    );

    // fetch updated cart items after add
    const updatedItems = await CartItem.find({ cart: cart._id }).populate({
      path: "variant",
      populate: "grocery",
    });

    return NextResponse.json({
      success: true,
      message: "Item added to cart",
      cartId: cart._id,
      items: updatedItems,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: `Add to cart error: ${error.message}` },
      { status: 500 }
    );
  }
}
