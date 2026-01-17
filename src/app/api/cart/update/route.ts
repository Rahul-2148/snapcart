// src/app/api/cart/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { GroceryVariant } from "@/models/groceryVariant.model";

export async function PATCH(req: NextRequest) {
  try {
    await connectDb();

    /* ================= AUTH ================= */
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    /* ================= BODY ================= */
    const { cartItemId, quantity } = await req.json();

    if (!cartItemId || quantity === undefined) {
      return NextResponse.json(
        { success: false, message: "cartItemId & quantity required" },
        { status: 400 }
      );
    }

    /* ================= CART ITEM ================= */
    const cartItem = await CartItem.findById(cartItemId).populate({
      path: "variant",
      populate: "grocery",
    });

    if (!cartItem) {
      return NextResponse.json(
        { success: false, message: "Cart item not found" },
        { status: 404 }
      );
    }

    /* ================= CART ================= */
    const cart = await Cart.findById(cartItem.cart);

    if (!cart) {
      return NextResponse.json(
        { success: false, message: "Cart not found" },
        { status: 404 }
      );
    }

    /* ================= REMOVE ITEM ================= */
    if (quantity <= 0) {
      await CartItem.findByIdAndDelete(cartItem._id);
    } else {
      /* ================= STOCK CHECK ================= */
      const variant = await GroceryVariant.findById(
        cartItem.variant._id
      ).populate("grocery");

      if (
        !variant ||
        !variant.grocery?.isActive ||
        quantity > variant.countInStock
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Stock exceeded or item unavailable",
          },
          { status: 400 }
        );
      }

      /* ================= UPDATE QUANTITY ================= */
      cartItem.quantity = quantity;
      await cartItem.save();
    }

    /* ================= FETCH UPDATED ITEMS ================= */
    const updatedItems = await CartItem.find({ cart: cart._id }).populate({
      path: "variant",
      populate: "grocery",
    });

    /* ================= CALCULATE SUBTOTAL ================= */
    const subTotal = updatedItems.reduce((sum, item) => {
      return sum + item.variant.price.selling * item.quantity;
    }, 0);

    /* ================= COUPON VALIDATION ================= */
    let couponRemoved = false;
    let couponDiscount = 0;
    let updatedCoupon: any = null;

    if (cart.coupon) {
      // ❌ min cart value fail → remove coupon
      if (
        cart.coupon.minCartValue &&
        subTotal < cart.coupon.minCartValue
      ) {
        cart.coupon = undefined;
        couponRemoved = true;
        await cart.save();
      } else {
        // ✅ coupon valid → recalculate discount
        if (cart.coupon.discountType === "PERCENTAGE") {
          couponDiscount =
            (subTotal * cart.coupon.discountValue) / 100;

          if (
            cart.coupon.maxDiscountAmount &&
            couponDiscount > cart.coupon.maxDiscountAmount
          ) {
            couponDiscount = cart.coupon.maxDiscountAmount;
          }
        } else {
          couponDiscount = cart.coupon.discountValue;
        }

        updatedCoupon = {
          code: cart.coupon.code,
          discountAmount: Math.round(couponDiscount),
          discountType: cart.coupon.discountType,
          minCartValue: cart.coupon.minCartValue,
          maxDiscountAmount: cart.coupon.maxDiscountAmount,
        };
      }
    }

    /* ================= RESPONSE ================= */
    return NextResponse.json({
      success: true,
      items: updatedItems,
      cartId: cart._id,
      couponRemoved,
      coupon: updatedCoupon,
      couponDiscount,
      message: couponRemoved
        ? "Coupon removed (minimum cart value not met)"
        : quantity <= 0
        ? "Item removed from cart"
        : "Item quantity updated",
    });
  } catch (error: any) {
    console.error("Cart update error:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Cart update error: ${error.message}`,
      },
      { status: 500 }
    );
  }
}
