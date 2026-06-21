import { NextRequest, NextResponse } from "next/server";
import connectDb, { startDbSession } from "@/lib/server/db";
import { auth } from "@/auth";
import { Order } from "@/models/order.model";
import { User } from "@/models/user.model";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { OrderItem } from "@/models/orderItem.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import mongoose from "mongoose";

export const POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDb();

  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const { orderId } = await req.json();

  if (!orderId) {
    return NextResponse.json({ message: "Order ID is required" }, { status: 400 });
  }

  const sessionWithDb = await startDbSession();

  try {
    const order = await Order.findById(orderId).session(sessionWithDb);

    if (!order) {
      if (sessionWithDb) {
        await sessionWithDb.abortTransaction();
        sessionWithDb.endSession();
      }
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.userId.toString() !== user._id.toString()) {
      if (sessionWithDb) {
        await sessionWithDb.abortTransaction();
        sessionWithDb.endSession();
      }
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (order.paymentStatus === 'paid') {
      if (sessionWithDb) {
        await sessionWithDb.abortTransaction();
        sessionWithDb.endSession();
      }
      return NextResponse.json({ message: "Order already paid" }, { status: 200 });
    }
    
    if (order.orderStatus === 'cancelled') {
        if (sessionWithDb) {
          await sessionWithDb.abortTransaction();
          sessionWithDb.endSession();
        }
        return NextResponse.json({ message: "Order already cancelled" }, { status: 200 });
    }

    const orderItems = await OrderItem.find({ order: order._id }).session(sessionWithDb);
    const cart = await Cart.findOne({ user: user._id }).session(sessionWithDb);
    if (!cart) {
        if (sessionWithDb) {
          await sessionWithDb.abortTransaction();
          sessionWithDb.endSession();
        }
        return NextResponse.json({ message: "Cart not found" }, { status: 404 });
    }

    for (const item of orderItems) {
      const variant = await GroceryVariant.findById(item.variant.variantId).session(sessionWithDb);
      if (variant) {
        const existingCartItem = await CartItem.findOne({ cart: cart._id, variant: variant._id }).session(sessionWithDb);
        if (!existingCartItem) {
          const cartItem = new CartItem({
            cart: cart._id,
            variant: variant._id,
            quantity: item.quantity,
            priceAtAdd: {
              mrp: variant.price.mrp,
              selling: variant.price.selling,
            }
          });
          await cartItem.save({ session: sessionWithDb });
        }
      }
    }
    
    // Restore coupon to cart if order had a coupon
    if (order.coupon && !cart.coupon) {
      // Normalize discountType to match Cart schema enum (FLAT | PERCENTAGE)
      cart.coupon = {
        couponId: order.coupon.couponId,
        code: order.coupon.code,
        discountType: order.coupon.discountType?.toUpperCase() as "FLAT" | "PERCENTAGE" || undefined,
        discountValue: order.coupon.discountValue,
        maxDiscountAmount: undefined, // Not stored in order
        minCartValue: undefined, // Not stored in order
      };
      await cart.save({ session: sessionWithDb });
    }
    
    await OrderItem.deleteMany({ order: order._id }).session(sessionWithDb);
    await Order.findByIdAndDelete(orderId).session(sessionWithDb);

    if (sessionWithDb) {
      await sessionWithDb.commitTransaction();
      sessionWithDb.endSession();
    }

    return NextResponse.json({ success: true, message: "Order cancelled and cart restored." });

  } catch (error: any) {
    if (sessionWithDb) {
      if (sessionWithDb.inTransaction()) {
        await sessionWithDb.abortTransaction();
      }
      sessionWithDb.endSession();
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
};
