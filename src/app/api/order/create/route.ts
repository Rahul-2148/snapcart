// src/app/api/order/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb, { startDbSession } from "@/lib/server/db";
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
import { notifyStoreManager } from "@/lib/server/notifications";
import {
  calculateDistance,
  estimateDeliveryTime,
  broadcastOrderToPartners,
  computePayout,
} from "@/lib/server/delivery";
import { calculateCheckoutPricing } from "@/lib/server/pricing";
import mongoose from "mongoose";

export const POST = async (req: NextRequest) => {
  let dbSession: any = null;
  try {
    dbSession = await startDbSession();


    const abortTx = async () => {
      if (dbSession) await dbSession.abortTransaction();
    };

    const commitTx = async () => {
      if (dbSession) await dbSession.commitTransaction();
    };

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

    const { paymentMethod, onlinePaymentType, deliveryAddress, storeId, useWallet } =
      await req.json();

    if (!paymentMethod || !deliveryAddress) {
      await abortTx();
      return NextResponse.json(
        { message: "paymentMethod & deliveryAddress required" },
        { status: 400 }
      );
    }

    if (!deliveryAddress.street || !deliveryAddress.street.trim()) {
      await abortTx();
      return NextResponse.json(
        { message: "Delivery address is incomplete. Flat, House, or Building details are required." },
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

    // Stock verification
    for (const item of cartItems) {
      const variant: any = item.variant;
      const freshVariant = await GroceryVariant.findById(variant?._id, "countInStock").session(dbSession);
      if (!variant || !variant.grocery?.isActive || !freshVariant || freshVariant.countInStock < item.quantity) {
        await abortTx();
        return NextResponse.json(
          { message: `Insufficient or invalid stock for ${variant?.grocery?.name || "item"}` },
          { status: 400 }
        );
      }
    }

    // Call unified pricing engine
    const pricing = await calculateCheckoutPricing({
      userId: user._id.toString(),
      deliveryAddress,
      paymentMethod,
      useWallet: !!useWallet,
      cartItemsInput: cartItems,
    });

    if (!pricing.serviceable) {
      await abortTx();
      return NextResponse.json(
        { message: pricing.notServiceableReason || "Delivery address is not serviceable." },
        { status: 400 }
      );
    }

    if (paymentMethod === "cod" && !pricing.codEligible) {
      await abortTx();
      return NextResponse.json(
        { message: pricing.codDisabledReason || "COD is not eligible for this order." },
        { status: 400 }
      );
    }

    const isKycApproved = user.kyc?.status === "approved";
    if (!isKycApproved && pricing.baseFinalTotal > 50000) {
      await abortTx();
      return NextResponse.json(
        { message: "Order value exceeds ₹50,000. KYC verification (Aadhaar & PAN) is mandatory for high-value orders." },
        { status: 403 }
      );
    }

    let wallet = null;
    if (pricing.walletDeduction > 0) {
      const { default: Wallet } = await import("@/models/wallet.model");
      wallet = await Wallet.findOne({ user: user._id }).session(dbSession);
    }

    const orderPayload = {
      userId: user._id,
      storeId: pricing.nearestStore?.id || null,
      subTotal: pricing.subTotal,
      totalMRP: pricing.totalMRP,
      savings: pricing.savings,
      deliveryFee: pricing.deliveryFee,
      packagingFee: pricing.packagingFee,
      weightSurcharge: pricing.weightSurcharge,
      taxes: pricing.serviceGst, // Service GST added to taxes
      codHandlingCharge: pricing.codHandlingCharge,
      finalTotal: pricing.finalTotal,
      walletDeduction: pricing.walletDeduction,
      coupon: pricing.couponSnapshot,
      couponDiscount: pricing.couponDiscount,
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

    const isFullyPaid = finalTotal === 0;

    // Process wallet debit if applicable
    if (walletDeduction > 0) {
      wallet.balance -= walletDeduction;
      await wallet.save({ session: dbSession });

      const { default: WalletTransaction } = await import("@/models/walletTransaction.model");
      const walletTx = new WalletTransaction({
        walletId: wallet._id,
        type: "debit",
        amount: walletDeduction,
        description: `Payment for Order #${newOrder.orderNumber}`,
        status: "completed",
        referenceId: newOrder._id.toString(),
      });
      await walletTx.save({ session: dbSession });
    }

    if (paymentMethod === "cod" || isFullyPaid) {
      // For COD or Fully Paid, decrement stock immediately
      await decrementStock(newOrder._id, dbSession);
      newOrder.orderStatus = "confirmed";
      newOrder.confirmedAt = new Date();
      if (isFullyPaid) {
        newOrder.paymentStatus = "paid";
      }

      // Create coupon usage and increment count
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

    if (paymentMethod === "cod" || isFullyPaid) {
      // Clear the user's cart only
      await CartItem.deleteMany({ cart: cart._id }).session(dbSession);
      cart.coupon = undefined;
      await cart.save({ session: dbSession });
    }

    await newOrder.save({ session: dbSession });

    // Award loyalty rewards (coins and scratchcard)
    if (paymentMethod === "cod" || isFullyPaid) {
      const { awardLoyaltyRewards } = await import("@/lib/server/rewards");
      await awardLoyaltyRewards(user._id, newOrder._id.toString(), subTotal, dbSession);
    }

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
        let storeLocation = deliverySettings.storeLocation;
        if (newOrder.storeId) {
          const { Store } = await import("@/models/store.model");
          const store = await Store.findById(newOrder.storeId).session(dbSession);
          if (store && store.location) {
            storeLocation = {
              address: store.location.address,
              lat: store.location.coordinates[1],
              lng: store.location.coordinates[0],
              pincode: store.location.pincode,
            };
          }
        }

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

    await commitTx();

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

      // Notify assigned store manager
      if (newOrder.storeId) {
        await notifyStoreManager(
          newOrder.storeId.toString(),
          {
            title: "New Order Assigned",
            message: `New order #${newOrder.orderNumber} placed by ${user.name}. Please confirm and pack the items.`,
            type: "order",
            link: `/store-manager/orders`,
            priority: "high",
          }
        );
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
          orderId: newOrder._id.toString(),
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
    if (dbSession && typeof dbSession.inTransaction === "function" && dbSession.inTransaction()) {
      await dbSession.abortTransaction();
    }
    return NextResponse.json(
      { message: `Order creation failed: ${error.message}` },
      { status: 500 }
    );
  } finally {
    if (dbSession && typeof dbSession.endSession === "function") {
      dbSession.endSession();
    }
  }
};
