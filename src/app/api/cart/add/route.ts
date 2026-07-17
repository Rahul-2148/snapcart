// src/app/api/cart/add/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { GroupCart } from "@/models/groupCart.model";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const body = await req.json();
    const { variantId, quantity = 1, groupCode, memberId, memberName, items } = body;

    let cart;
    let addedBy = undefined;

    if (groupCode && groupCode.trim() !== "") {
      // Find active group session
      const groupSession = await GroupCart.findOne({
        code: groupCode.trim().toUpperCase(),
        isActive: true,
      });

      if (!groupSession) {
        return NextResponse.json(
          { success: false, message: "Active group session not found" },
          { status: 404 }
        );
      }

      cart = await Cart.findOne({ user: groupSession.host });
      if (!cart) {
        cart = await Cart.create({ user: groupSession.host });
      }

      if (memberId && memberName) {
        addedBy = { memberId, name: memberName };
      }
    } else {
      // Normal flow: require authenticated user
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, message: "Login required" },
          { status: 401 }
        );
      }

      cart = await Cart.findOne({ user: session.user.id });
      if (!cart) {
        cart = await Cart.create({ user: session.user.id });
      }
    }

    const itemsToAdd = Array.isArray(items) ? items : [{ variantId, quantity }];

    for (const item of itemsToAdd) {
      const currentVariantId = item.variantId;
      const currentQty = item.quantity || 1;

      if (!currentVariantId) continue;

      const variant = await GroceryVariant.findById(currentVariantId).populate("grocery");
      if (!variant || !variant.grocery?.isActive) {
        continue;
      }

      // Check total variant quantity across all group members for stock validation
      const existingItems = await CartItem.find({
        cart: cart._id,
        variant: currentVariantId,
      });
      const currentTotalQty = existingItems.reduce((sum, it) => sum + it.quantity, 0);

      if (currentTotalQty + currentQty > variant.countInStock) {
        continue;
      }

      // Build query targeting this member specifically (or host without addedBy)
      const query: any = { cart: cart._id, variant: currentVariantId };
      if (addedBy) {
        query["addedBy.memberId"] = addedBy.memberId;
      } else {
        query["addedBy"] = { $exists: false };
      }

      await CartItem.findOneAndUpdate(
        query,
        {
          $inc: { quantity: currentQty },
          $setOnInsert: {
            priceAtAdd: {
              mrp: variant.price.mrp,
              selling: variant.price.selling,
            },
            ...(addedBy ? { addedBy } : {}),
          },
        },
        { upsert: true, new: true }
      );
    }

    // Fetch updated cart items
    const updatedItems = await CartItem.find({ cart: cart._id }).populate({
      path: "variant",
      populate: {
        path: "grocery",
        populate: { path: "category", select: "name" },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Items added to cart",
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
