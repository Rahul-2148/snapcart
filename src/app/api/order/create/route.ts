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
import { CodSettings } from "@/models/codSettings.model";
import Notification from "@/models/notification.model";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { DeliverySettings } from "@/models/deliverySettings.model";
import { sendNotification } from "@/lib/server/socket";
import { sendOrderConfirmationEmail } from "@/lib/server/email";
import {
  calculateDistance,
  estimateDeliveryTime,
  broadcastOrderToPartners,
  computePayout,
} from "@/lib/server/delivery";
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

    if (paymentMethod === "online") {
      return NextResponse.json(
        { message: "Online orders must be created after payment success." },
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
    const chargedProducts = new Set<string>(); // Track unique products for COD charge

    for (const item of cartItems) {
      const variant: any = item.variant;

      // Critical: Re-validate stock within the transaction
      const freshVariant = await GroceryVariant.findById(
        variant._id,
        "countInStock cod"
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

      // Check COD status
      const codStatus = freshVariant.cod?.status || "with-charge";
      
      if (codStatus === "not-allowed") {
        if (paymentMethod === "cod") {
          await dbSession.abortTransaction();
          return NextResponse.json(
            {
              message: `COD is not allowed for ${variant.grocery.name}`,
            },
            { status: 400 }
          );
        }
      } else if (codStatus === "with-charge") {
        // Track product for COD charge (one charge per unique product)
        chargedProducts.add(freshVariant._id.toString());
      }
      // If "free", no charge is added
    }

    const savings = totalMRP - subTotal;
    const deliveryFee = subTotal >= 500 ? 0 : 40;

    // Calculate COD charge based on product status and global settings
    let totalCodCharge = 0;
    if (paymentMethod === "cod") {
      // Fetch COD settings for flat fee
      const codSettings = await CodSettings.findOne().session(dbSession);
      const flatCharge = codSettings?.flatCharge || 10;

      // Apply flat charge for each unique "with-charge" product
      totalCodCharge = chargedProducts.size * flatCharge;
    }

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

    const finalTotal = Math.max(subTotal + deliveryFee + totalCodCharge - couponDiscount, 0);

    const orderPayload = {
      userId: user._id,
      subTotal,
      totalMRP,
      savings,
      deliveryFee,
      codHandlingCharge: totalCodCharge,
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

    if (paymentMethod === "cod") {
      // Clear the user's cart only for COD orders
      await CartItem.deleteMany({ cart: cart._id }).session(dbSession);
      cart.coupon = undefined;
      await cart.save({ session: dbSession });
    }

    await newOrder.save({ session: dbSession });

    // ===== CREATE DELIVERY ASSIGNMENT =====
    let deliveryAssignment: any = null;
    try {
      let deliverySettings = await DeliverySettings.findOne().session(dbSession);
      if (!deliverySettings) {
        deliverySettings = await DeliverySettings.create(
          [
            {
              storeLocation: {
                address: "Default store",
                lat: 28.6139,
                lng: 77.209,
                pincode: "000000",
              },
            },
          ],
          { session: dbSession },
        ).then((docs) => docs[0]);
      }
      
      if (deliverySettings && newOrder.orderStatus === "confirmed") {
        // Calculate distance from store to delivery location
        const storeLocation = deliverySettings.storeLocation;
        const distance = calculateDistance(
          storeLocation.lat,
          storeLocation.lng,
          deliveryAddress.location?.lat || 0,
          deliveryAddress.location?.lng || 0
        );

        const estimatedTime = estimateDeliveryTime(distance);
        const rewardAmount = computePayout(distance, deliverySettings);

        // Create delivery assignment
        deliveryAssignment = new DeliveryAssignment({
          order: newOrder._id,
          orderNumber: newOrder.orderNumber,
          pickupLocation: {
            address: storeLocation.address,
            lat: storeLocation.lat,
            lng: storeLocation.lng,
            pincode: storeLocation.pincode,
          },
          deliveryLocation: {
            address: deliveryAddress.fullAddress,
            fullName: deliveryAddress.fullName,
            mobile: deliveryAddress.mobile,
            lat: deliveryAddress.location?.lat || 0,
            lng: deliveryAddress.location?.lng || 0,
            pincode: deliveryAddress.pincode,
          },
          estimatedDistance: distance,
          estimatedTime: estimatedTime,
          rewardAmount,
          status: "broadcasted",
          priority: "normal",
          timeline: [
            {
              status: "broadcasted",
              timestamp: new Date(),
              note: "Order confirmed and broadcasted to nearby partners",
            },
          ],
        });

        await deliveryAssignment.save({ session: dbSession });
        newOrder.assignment = deliveryAssignment._id;
        await newOrder.save({ session: dbSession });
      }
    } catch (assignmentError) {
      console.error("Error creating delivery assignment:", assignmentError);
      // Don't block order creation if assignment creation fails
    }

    await dbSession.commitTransaction();

    // Notify all admins about the new order
    try {
      const admins = await User.find({ roles: "admin" });
      for (const admin of admins) {
        const newNotification = await Notification.create({
          recipient: admin._id,
          recipientRole: "admin",
          type: "order",
          title: "New Order",
          message: `New order #${newOrder.orderNumber} placed by ${user.name}.`,
          link: `/admin/orders?orderId=${newOrder._id}`,
          read: false,
          priority: "high",
          createdAt: new Date(),
        });
        await sendNotification(admin._id, newNotification);
      }

      // If delivery assignment created, start broadcast process
      if (deliveryAssignment) {
        try {
          await broadcastOrderToPartners(deliveryAssignment._id.toString());
        } catch (broadcastError) {
          console.error("Error broadcasting order to delivery partners:", broadcastError);
          // Notify admins that order needs manual delivery assignment
          for (const admin of admins) {
            const notification = await Notification.create({
              recipient: admin._id,
              recipientRole: "admin",
              type: "system",
              title: "Delivery Assignment Issue",
              message: `Order #${newOrder.orderNumber} needs manual delivery assignment - no delivery partners available.`,
              link: `/admin/orders?orderId=${newOrder._id}`,
              read: false,
              priority: "high",
              createdAt: new Date(),
            });
            await sendNotification(admin._id, notification);
          }
        }
      }
    } catch (notificationError) {
      console.error(
        "Error sending new order notification to admins:",
        notificationError
      );
      // Do not block order creation if notification fails
    }

    // Send order confirmation email only for COD (online will send after payment success)
    if (paymentMethod === "cod") {
      try {
        // Get populated order items for email
        const populatedOrderItems = await OrderItem.find({
          order: newOrder._id,
        }).populate({
          path: "grocery",
          select: "name images",
        });

        const emailItems = populatedOrderItems.map((item: any) => ({
          name: item.groceryName || item.grocery?.name,
          quantity: item.quantity,
          price: item.price.sellingPrice,
          imageUrl: item.grocery?.images?.[0]?.url,
        }));

        await sendOrderConfirmationEmail(user.email, user.name, {
          orderNumber: newOrder.orderNumber,
          orderDate: new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          items: emailItems,
          subTotal,
          deliveryFee,
          codHandlingCharge: totalCodCharge,
          couponDiscount,
          finalTotal,
          currency: "₹",
          deliveryAddress,
          paymentMethod: "cod",
        });
      } catch (emailError) {
        console.error("Error sending order confirmation email:", emailError);
        // Don't block order creation if email fails
      }
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
          codHandlingCharge: totalCodCharge,
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
