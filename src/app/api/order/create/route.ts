// src/app/api/order/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { decrementStock } from "@/lib/utils/decrementStock";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { CouponUsage } from "@/models/couponUsage.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { Order } from "@/models/order.model";
import { OrderItem } from "@/models/orderItem.model";
import { User } from "@/models/user.model";
import { Coupon } from "@/models/coupon.model";
import Notification from "@/models/notification.model"; // Import Notification model
import { sendNotification } from "@/lib/server/socket"; // Import sendNotification
import { sendOrderConfirmationEmail } from "@/lib/server/email"; // Import email service
import mongoose from "mongoose";

export const POST = async (req: NextRequest) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    await connectDb();

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email }).session(
      dbSession
    );
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { paymentMethod, onlinePaymentType, deliveryAddress } =
      await req.json();

    if (!paymentMethod || !deliveryAddress) {
      return NextResponse.json(
        { message: "paymentMethod & deliveryAddress required" },
        { status: 400 }
      );
    }

    const cart = await Cart.findOne({ user: user._id }).session(dbSession);
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
      })
      .session(dbSession);

    if (!cartItems.length) {
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
    }

    let subTotal = 0;
    let totalMRP = 0;

    for (const item of cartItems) {
      const variant: any = item.variant;

      // Critical: Re-validate stock within the transaction
      const freshVariant = await GroceryVariant.findById(
        variant._id,
        "countInStock"
      ).session(dbSession);

      if (
        !variant ||
        !variant.grocery?.isActive ||
        !freshVariant ||
        freshVariant.countInStock < item.quantity
      ) {
        await dbSession.abortTransaction();
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

    /* ===== COUPON RE-CALCULATION (CRITICAL) ===== */
    let couponDiscount = 0;
    let couponSnapshot = undefined;

    if (cart.coupon?.discountType) {
      // Re-validate coupon server-side before applying
      if (cart.coupon.minCartValue && subTotal < cart.coupon.minCartValue) {
        // Coupon is invalid for this cart, ignore it but don't error out
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

    const orderPayload = {
      userId: user._id,
      subTotal,
      totalMRP,
      savings,
      deliveryFee,
      finalTotal,
      coupon: couponSnapshot,
      couponDiscount,
      deliveryAddress,
      paymentMethod,
      onlinePaymentType,
      paymentStatus: "pending",
      orderStatus: "pending",
    };

    const newOrder = new Order(orderPayload);
    newOrder.orderNumber = `ORD-${Date.now()}-${newOrder._id
      .toString()
      .slice(-5)}`;

    const orderItemsPayload = cartItems.map((item: any) => ({
      order: newOrder._id,
      grocery: item.variant.grocery._id,
      groceryName: item.variant.grocery.name,
      variant: {
        variantId: item.variant._id,
        label: item.variant.label,
        unit: item.variant.unit,
        value: item.variant.value,
      },
      price: {
        mrpPrice: item.priceAtAdd.mrp,
        sellingPrice: item.priceAtAdd.selling,
      },
      quantity: item.quantity,
    }));

    const insertedOrderItems = await OrderItem.insertMany(orderItemsPayload, {
      session: dbSession,
    });
    newOrder.orderItems = insertedOrderItems.map((item) => item._id);

    if (paymentMethod === "cod") {
      // For COD, decrement stock immediately
      await decrementStock(newOrder._id, dbSession);
      newOrder.orderStatus = "confirmed";
      newOrder.confirmedAt = new Date();

      // Create coupon usage and increment count for COD
      if (couponSnapshot?.couponId) {
        await CouponUsage.create(
          [
            {
              coupon: couponSnapshot.couponId,
              user: user._id,
              order: newOrder._id,
              discountAmount: couponDiscount,
            },
          ],
          { session: dbSession }
        );
        // Increment usage count
        await Coupon.findByIdAndUpdate(
          couponSnapshot.couponId,
          { $inc: { usageCount: 1 } },
          { session: dbSession }
        );
      }
    }
    // For online payment, stock will be decremented via webhook after successful payment
    // Coupon usage will be created in payment callback

    // Clear the user's cart
    await CartItem.deleteMany({ cart: cart._id }).session(dbSession);
    cart.coupon = undefined;
    await cart.save({ session: dbSession });

    await newOrder.save({ session: dbSession });

    await dbSession.commitTransaction();

    // Notify all admins about the new order
    try {
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        const newNotification = await Notification.create({
          recipient: admin._id,
          type: "order",
          message: `New order #${newOrder.orderNumber} placed by ${user.name}.`,
          link: `/admin/orders?orderId=${newOrder._id}`, // Optional: Link to the new order in admin panel
          read: false,
          createdAt: new Date(),
        });
        await sendNotification(admin._id, newNotification);
      }
    } catch (notificationError) {
      console.error(
        "Error sending new order notification to admins:",
        notificationError
      );
      // Do not block order creation if notification fails
    }

    // Send order confirmation email to user
    try {
      // Get populated order items for email
      const populatedOrderItems = await OrderItem.find({ 
        order: newOrder._id 
      }).populate({
        path: 'grocery',
        select: 'name'
      });

      const emailItems = populatedOrderItems.map((item: any) => ({
        name: item.groceryName,
        quantity: item.quantity,
        price: item.price.sellingPrice,
      }));

      await sendOrderConfirmationEmail(
        user.email,
        user.name,
        {
          orderNumber: newOrder.orderNumber,
          orderDate: new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          items: emailItems,
          subTotal,
          deliveryFee,
          couponDiscount,
          finalTotal,
          currency: '₹',
          deliveryAddress,
          paymentMethod: paymentMethod === 'cod' ? 'cod' : 'online',
        }
      );
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
      // Don't block order creation if email fails
    }

    return NextResponse.json(
      {
        success: true,
        orderId: newOrder._id,
        orderNumber: newOrder.orderNumber,
        paymentRequired: paymentMethod === "online",
        orderItems: orderItemsPayload,
        orderDetails: {
          subTotal,
          deliveryFee,
          couponDiscount,
          finalTotal,
          deliveryAddress,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (dbSession.inTransaction()) {
      await dbSession.abortTransaction();
    }
    return NextResponse.json(
      { message: `Order creation failed: ${error.message}` },
      { status: 500 }
    );
  } finally {
    dbSession.endSession();
  }
};
