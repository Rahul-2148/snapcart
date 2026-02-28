import mongoose from "mongoose";
import { PaymentSession, IPaymentSessionItem } from "@/models/paymentSession.model";
import { Order } from "@/models/order.model";
import { OrderItem } from "@/models/orderItem.model";
import { CouponUsage } from "@/models/couponUsage.model";
import { Coupon } from "@/models/coupon.model";
import { decrementStock } from "@/lib/utils/decrementStock";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { User } from "@/models/user.model";

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
  dbSession: mongoose.ClientSession
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
    codHandlingCharge: 0,
    finalTotal: paymentSession.finalTotal,
    coupon: paymentSession.coupon,
    couponDiscount: paymentSession.couponDiscount,
    deliveryAddress: paymentSession.deliveryAddress,
    paymentMethod: "online",
    onlinePaymentType: paymentSession.onlinePaymentType,
    paymentStatus: "paid",
    orderStatus: "confirmed",
    confirmedAt: new Date(),
    currency: paymentSession.currency,
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

  newOrder.paymentDetails.push(paymentDetails);

  await newOrder.save({ session: dbSession });

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
