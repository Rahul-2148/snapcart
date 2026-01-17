// src/app/api/cart/merge/route.ts
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

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: true, items: [] });
    }

    let cart = await Cart.findOne({ user: session.user.id });
    if (!cart) cart = await Cart.create({ user: session.user.id });

    for (const item of items) {
      const variant = await GroceryVariant.findById(item.variantId);
      if (!variant || variant.countInStock <= 0) continue;

      const existingItem = await CartItem.findOne({
        cart: cart._id,
        variant: item.variantId,
      });

      const currentQty = existingItem?.quantity ?? 0;
      const allowedQty = Math.min(
        item.quantity,
        variant.countInStock - currentQty
      );

      if (allowedQty <= 0) continue;

      await CartItem.findOneAndUpdate(
        { cart: cart._id, variant: item.variantId },
        {
          $inc: { quantity: allowedQty },
          $setOnInsert: {
            priceAtAdd: {
              mrp: variant.price.mrp,
              selling: variant.price.selling,
            },
          },
        },
        { upsert: true }
      );
    }

    // return updated cart (realtime consistency)
    const updatedItems = await CartItem.find({ cart: cart._id }).populate({
      path: "variant",
      populate: "grocery",
    });

    return NextResponse.json({
      success: true,
      message: "Cart merged",
      cartId: cart._id,
      items: updatedItems,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: `Merge cart error: ${error.message}` },
      { status: 500 }
    );
  }
}
