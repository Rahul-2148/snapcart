import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { PaymentSession } from "@/models/paymentSession.model";
import { User } from "@/models/user.model";

export const POST = async (req: NextRequest) => {
  try {
    await connectDb();

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { deliveryAddress, onlinePaymentType } = await req.json();

    if (!deliveryAddress || !onlinePaymentType) {
      return NextResponse.json(
        { message: "deliveryAddress & onlinePaymentType required" },
        { status: 400 }
      );
    }

    if (!["stripe", "razorpay"].includes(onlinePaymentType)) {
      return NextResponse.json(
        { message: "Invalid onlinePaymentType" },
        { status: 400 }
      );
    }

    const cart = await Cart.findOne({ user: user._id });
    if (!cart) {
      return NextResponse.json({ message: "Cart not found" }, { status: 400 });
    }

    const cartItems = await CartItem.find({ cart: cart._id })
      .populate({
        path: "variant",
        populate: {
          path: "grocery",
          select: "name isActive",
        },
      });

    if (!cartItems.length) {
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
    }

    let subTotal = 0;
    let totalMRP = 0;

    for (const item of cartItems) {
      const variant: any = item.variant;

      const freshVariant = await GroceryVariant.findById(
        variant._id,
        "countInStock"
      );

      if (
        !variant ||
        !variant.grocery?.isActive ||
        !freshVariant ||
        freshVariant.countInStock < item.quantity
      ) {
        return NextResponse.json(
          {
            message: `Insufficient or invalid stock for ${
              variant?.grocery?.name || "item"
            }`,
          },
          { status: 400 }
        );
      }

      subTotal += item.priceAtAdd.selling * item.quantity;
      totalMRP += item.priceAtAdd.mrp * item.quantity;
    }

    const savings = totalMRP - subTotal;
    const deliveryFee = subTotal >= 500 ? 0 : 40;

    /* ===== COUPON RE-CALCULATION ===== */
    let couponDiscount = 0;
    let couponSnapshot = undefined;

    if (cart.coupon?.discountType) {
      if (cart.coupon.minCartValue && subTotal < cart.coupon.minCartValue) {
        // Ignore invalid coupon
      } else {
        const discountTypeNormalized = (
          cart.coupon.discountType || ""
        ).toLowerCase();

        if (discountTypeNormalized === "flat") {
          couponDiscount = cart.coupon.discountValue || 0;
        }

        if (discountTypeNormalized === "percentage") {
          couponDiscount = Math.floor(
            (subTotal * (cart.coupon.discountValue || 0)) / 100
          );
          if (cart.coupon.maxDiscountAmount) {
            couponDiscount = Math.min(
              couponDiscount,
              cart.coupon.maxDiscountAmount
            );
          }
        }
        couponSnapshot = {
          ...cart.coupon.toObject(),
          discountType: discountTypeNormalized,
          discountAmount: couponDiscount,
        };
      }
    }

    const finalTotal = Math.max(subTotal + deliveryFee - couponDiscount, 0);

    const itemsSnapshot = cartItems.map((item: any) => ({
      variantId: item.variant._id,
      groceryId: item.variant.grocery._id,
      groceryName: item.variant.grocery.name,
      variantLabel: item.variant.label,
      unit: item.variant.unit,
      value: item.variant.value,
      quantity: item.quantity,
      price: {
        mrpPrice: item.priceAtAdd.mrp,
        sellingPrice: item.priceAtAdd.selling,
      },
    }));

    const expiryMinutes = Number(
      process.env.PENDING_ORDER_EXPIRY_MINUTES || 30
    );

    const paymentSession = await PaymentSession.create({
      userId: user._id,
      items: itemsSnapshot,
      subTotal,
      totalMRP,
      savings,
      deliveryFee,
      finalTotal,
      coupon: couponSnapshot,
      couponDiscount,
      deliveryAddress,
      paymentMethod: "online",
      onlinePaymentType,
      status: "pending",
      expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    });

    return NextResponse.json({
      success: true,
      paymentSessionId: paymentSession._id,
    });
  } catch (error: any) {
    console.error("Create payment session error:", error);
    return NextResponse.json(
      { message: `Failed to create payment session: ${error.message}` },
      { status: 500 }
    );
  }
};
