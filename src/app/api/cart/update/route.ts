// src/app/api/cart/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { GroupCart } from "@/models/groupCart.model";

export async function PATCH(req: NextRequest) {
  try {
    await connectDb();

    /* ================= AUTH ================= */
    const session = await auth();

    /* ================= BODY ================= */
    const { cartItemId, quantity, groupCode, memberId } = await req.json();

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

    /* ================= PERMISSION & AUTH CHECK ================= */
    let isAuthorized = false;

    // 1. Check if authenticated user owns the cart (Normal Cart or Group Cart Host)
    if (session?.user?.id && cart.user.toString() === session.user.id) {
      isAuthorized = true;
    }

    // 2. If not host, check if guest member is authorized for this group cart item
    if (!isAuthorized && groupCode && memberId) {
      const groupSession = await GroupCart.findOne({
        code: groupCode.trim().toUpperCase(),
        isActive: true,
      });

      if (groupSession) {
        // If logged-in user matches the host, they are authorized
        if (session?.user?.id && groupSession.host.toString() === session.user.id) {
          isAuthorized = true;
        } else {
          // Check if guest is a member of the group AND is the owner of this cart item
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
        { success: false, message: "Unauthorized: You are not allowed to update this item" },
        { status: 401 }
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

      if (!variant) {
        return NextResponse.json(
          {
            success: false,
            message: "Variant not found",
          },
          { status: 404 }
        );
      }

      if (!variant.grocery?.isActive) {
        return NextResponse.json(
          {
            success: false,
            message: "Item is no longer available",
          },
          { status: 400 }
        );
      }

      if (quantity > variant.countInStock) {
        return NextResponse.json(
          {
            success: false,
            message: `Only ${variant.countInStock} items available in stock`,
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
      populate: {
        path: "grocery",
        populate: { path: "category", select: "name" },
      },
    });

    /* ================= CALCULATE SUBTOTAL ================= */
    const subTotal = updatedItems.reduce((sum, item) => {
      if (!item?.variant?.price?.selling) {
        console.warn(`Invalid variant price for item: ${item._id}`);
        return sum;
      }
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
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return NextResponse.json(
      {
        success: false,
        message: `Cart update error: ${error.message}`,
      },
      { status: 500 }
    );
  }
}
