import mongoose from "mongoose";
import { PaymentSession, IPaymentSessionItem } from "@/models/paymentSession.model";
import { Grocery } from "@/models/grocery.model";
import { Order } from "@/models/order.model";
import { OrderItem } from "@/models/orderItem.model";
import { CouponUsage } from "@/models/couponUsage.model";
import { Coupon } from "@/models/coupon.model";
import { decrementStock } from "@/lib/utils/decrementStock";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { User } from "@/models/user.model";
import { notifyStoreManager } from "@/lib/server/notifications";
import { awardLoyaltyRewards } from "@/lib/server/rewards";

export interface PaymentDetailsInput {
  provider: "stripe" | "razorpay";
  transactionId: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: Date;
}

export const createOrderFromPaymentSession = async (
  paymentSessionId: string,
  paymentDetails: PaymentDetailsInput,
  dbSession?: any
) => {
  const paymentSession = await PaymentSession.findOneAndUpdate(
    { _id: paymentSessionId, status: "pending" },
    { $set: { status: "processing" } },
    { new: true, session: dbSession }
  );

  if (!paymentSession) {
    const existingSession = await PaymentSession.findById(paymentSessionId).session(dbSession);
    if (!existingSession) {
      throw new Error("Payment session not found");
    }

    if (existingSession.status === "paid" && existingSession.orderId) {
      const existingOrder = await Order.findById(existingSession.orderId).session(dbSession);
      if (existingOrder) {
        return existingOrder;
      }
    }

    if (existingSession.status === "processing") {
      throw new Error("Payment session is being processed");
    }

    throw new Error("Payment session already processed");
  }

  const user = await User.findById(paymentSession.userId).session(dbSession);
  if (!user) {
    throw new Error("User not found");
  }

  const newOrder = new Order({
    userId: paymentSession.userId,
    subTotal: paymentSession.subTotal,
    totalMRP: paymentSession.totalMRP,
    savings: paymentSession.savings,
    deliveryFee: paymentSession.deliveryFee,
    packagingFee: paymentSession.packagingFee || 0,
    weightSurcharge: paymentSession.weightSurcharge || 0,
    taxes: paymentSession.taxes || 0,
    codHandlingCharge: 0,
    finalTotal: paymentSession.finalTotal,
    walletDeduction: paymentSession.walletDeduction || 0,
    coupon: paymentSession.coupon,
    couponDiscount: paymentSession.couponDiscount,
    deliveryAddress: paymentSession.deliveryAddress,
    paymentMethod: "online",
    onlinePaymentType: paymentSession.onlinePaymentType,
    paymentStatus: "paid",
    orderStatus: "confirmed",
    confirmedAt: new Date(),
    currency: paymentSession.currency,
    storeId: paymentSession.storeId || null,
  });

  newOrder.orderNumber = `ORD-${Date.now()}-${newOrder._id
    .toString()
    .slice(-5)}`;

  const orderItemsPayload = paymentSession.items.map((item: IPaymentSessionItem) => ({
    order: newOrder._id,
    grocery: item.groceryId,
    groceryName: item.groceryName,
    variant: {
      variantId: item.variantId,
      label: item.variantLabel,
      unit: item.unit,
      value: item.value,
    },
    price: {
      mrpPrice: item.price.mrpPrice,
      sellingPrice: item.price.sellingPrice,
    },
    quantity: item.quantity,
  }));

  const insertedOrderItems = await OrderItem.insertMany(orderItemsPayload, {
    session: dbSession,
  });
  newOrder.orderItems = insertedOrderItems.map((item) => item._id);

  // Increment sales count for each ordered grocery item
  for (const item of orderItemsPayload) {
    await Grocery.findByIdAndUpdate(
      item.grocery,
      { $inc: { salesCount: item.quantity } },
      { session: dbSession }
    );
  }

  newOrder.paymentDetails.push(paymentDetails);

  await newOrder.save({ session: dbSession });

  // If payment session had a wallet deduction, process it now
  if (paymentSession.walletDeduction && paymentSession.walletDeduction > 0) {
    const { default: Wallet } = await import("@/models/wallet.model");
    const { default: WalletTransaction } = await import("@/models/walletTransaction.model");

    const wallet = await Wallet.findOne({ user: paymentSession.userId }).session(dbSession);
    if (wallet) {
      const actualDeduction = Math.min(wallet.balance, paymentSession.walletDeduction);
      wallet.balance = Math.max(wallet.balance - actualDeduction, 0);
      await wallet.save({ session: dbSession });

      // Log transaction
      const walletTx = new WalletTransaction({
        walletId: wallet._id,
        type: "debit",
        amount: actualDeduction,
        description: `Payment for Order #${newOrder.orderNumber}`,
        status: "completed",
        referenceId: newOrder._id.toString(),
      });
      await walletTx.save({ session: dbSession });
    }
  }

  // Award loyalty rewards (coins and scratchcard)
  try {
    await awardLoyaltyRewards(newOrder.userId, newOrder._id.toString(), newOrder.subTotal, dbSession);
  } catch (rewardsError) {
    console.error("Failed to award loyalty rewards for online order:", rewardsError);
  }

  // Notify assigned store manager of new online order
  if (newOrder.storeId) {
    try {
      await notifyStoreManager(
        newOrder.storeId.toString(),
        {
          title: "New Order Assigned",
          message: `New order #${newOrder.orderNumber} placed by ${user.name || "Customer"}. Please confirm and pack the items.`,
          type: "order",
          link: `/store-manager/orders`,
          priority: "high",
        },
        dbSession
      );
    } catch (err) {
      console.error("Failed to notify store manager:", err);
    }
  }

  await decrementStock(newOrder._id, dbSession);

  if (paymentSession.coupon?.couponId) {
    await CouponUsage.create(
      [
        {
          coupon: paymentSession.coupon.couponId,
          user: paymentSession.userId,
          order: newOrder._id,
          discountAmount: paymentSession.couponDiscount || 0,
        },
      ],
      { session: dbSession }
    );

    await Coupon.findByIdAndUpdate(
      paymentSession.coupon.couponId,
      { $inc: { usageCount: 1 } },
      { session: dbSession }
    );
  }

  const cart = await Cart.findOne({ user: paymentSession.userId }).session(dbSession);
  if (cart) {
    for (const item of paymentSession.items) {
      const cartItem = await CartItem.findOne({
        cart: cart._id,
        variant: item.variantId,
      }).session(dbSession);
      if (!cartItem) continue;

      if (cartItem.quantity > item.quantity) {
        cartItem.quantity -= item.quantity;
        await cartItem.save({ session: dbSession });
      } else {
        await CartItem.deleteOne({ _id: cartItem._id }).session(dbSession);
      }
    }

    if (
      paymentSession.coupon?.couponId &&
      cart.coupon?.couponId &&
      cart.coupon.couponId.toString() === paymentSession.coupon.couponId.toString()
    ) {
      cart.coupon = undefined;
    }

    await cart.save({ session: dbSession });
  }

  paymentSession.status = "paid";
  paymentSession.orderId = newOrder._id;
  await paymentSession.save({ session: dbSession });

  return newOrder;
};
