// src/app/api/coupon/apply-coupon/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { Coupon } from "@/models/coupon.model";
import { CouponUsage } from "@/models/couponUsage.model";

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json(
        { message: "Coupon code required" },
        { status: 400 }
      );
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return NextResponse.json({ message: "Invalid coupon" }, { status: 400 });
    }

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      return NextResponse.json(
        { message: "Coupon expired or inactive" },
        { status: 400 }
      );
    }

    if (coupon.usageLimit) {
      const totalUsed = await CouponUsage.countDocuments({
        coupon: coupon._id,
      });
      if (totalUsed >= coupon.usageLimit) {
        return NextResponse.json(
          { message: "Coupon usage limit reached" },
          { status: 400 }
        );
      }
    }

    if (coupon.usagePerUser) {
      const userUsed = await CouponUsage.countDocuments({
        coupon: coupon._id,
        user: session.user.id,
      });
      if (userUsed >= coupon.usagePerUser) {
        return NextResponse.json(
          { message: "Coupon already used by user" },
          { status: 400 }
        );
      }
    }

    const cart = await Cart.findOne({ user: session.user.id });
    if (!cart) {
      return NextResponse.json({ message: "Cart not found" }, { status: 400 });
    }

    const cartItems = await CartItem.find({ cart: cart._id }).populate({
      path: "variant",
      populate: { path: "grocery", select: "category" },
    });

    if (!cartItems.length) {
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
    }

    let subTotal = 0;
    for (const item of cartItems) {
      subTotal += item.priceAtAdd.selling * item.quantity;
    }

    if (coupon.minCartValue && subTotal < coupon.minCartValue) {
      return NextResponse.json(
        { message: `Minimum cart value ₹${coupon.minCartValue}` },
        { status: 400 }
      );
    }

    let discountAmount = 0;

    if (coupon.discountType === "FLAT") {
      discountAmount = coupon.discountValue;
    }

    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = Math.floor((subTotal * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    }

    discountAmount = Math.max(discountAmount, 0);

    cart.coupon = {
      couponId: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minCartValue: coupon.minCartValue,
      discountAmount,
    };

    await cart.save();

    return NextResponse.json({
      success: true,
      message: "Coupon applied successfully",
      discountAmount,
    });
  } catch (error: any) {
    console.error("Apply Coupon Error:", error);
    return NextResponse.json(
      { message: `Apply coupon error: ${error.message}` },
      { status: 500 }
    );
  }
}
