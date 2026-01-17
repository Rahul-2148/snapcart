import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
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

  const sessionWithDb = await mongoose.startSession();
  sessionWithDb.startTransaction();

  try {
    const order = await Order.findById(orderId).session(sessionWithDb);

    if (!order) {
      await sessionWithDb.abortTransaction();
      sessionWithDb.endSession();
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.userId.toString() !== user._id.toString()) {
      await sessionWithDb.abortTransaction();
      sessionWithDb.endSession();
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (order.paymentStatus === 'paid') {
      await sessionWithDb.abortTransaction();
      sessionWithDb.endSession();
      return NextResponse.json({ message: "Order already paid" }, { status: 200 });
    }
    
    if (order.orderStatus === 'cancelled') {
        await sessionWithDb.abortTransaction();
        sessionWithDb.endSession();
        return NextResponse.json({ message: "Order already cancelled" }, { status: 200 });
    }

    const orderItems = await OrderItem.find({ order: order._id }).session(sessionWithDb);
    const cart = await Cart.findOne({ user: user._id }).session(sessionWithDb);
    if (!cart) {
        await sessionWithDb.abortTransaction();
        sessionWithDb.endSession();
        return NextResponse.json({ message: "Cart not found" }, { status: 404 });
    }

    for (const item of orderItems) {
        const variant = await GroceryVariant.findById(item.variant.variantId).session(sessionWithDb);
        if (variant) {
            const existingCartItem = await CartItem.findOne({ cart: cart._id, variant: variant._id }).session(sessionWithDb);
            if (existingCartItem) {
                existingCartItem.quantity += item.quantity;
                await existingCartItem.save({ session: sessionWithDb });
            } else {
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
    
    await OrderItem.deleteMany({ order: order._id }).session(sessionWithDb);
    await Order.findByIdAndDelete(orderId).session(sessionWithDb);

    await sessionWithDb.commitTransaction();
    sessionWithDb.endSession();

    return NextResponse.json({ success: true, message: "Order cancelled and cart restored." });

  } catch (error: any) {
    await sessionWithDb.abortTransaction();
    sessionWithDb.endSession();
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
};
