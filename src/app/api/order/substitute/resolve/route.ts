// src/app/api/order/substitute/resolve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { OrderItem } from "@/models/orderItem.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/walletTransaction.model";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const body = await req.json();
    const { orderId, orderItemId, action } = body;

    if (!orderId || !orderItemId || !action) {
      return NextResponse.json({ error: "orderId, orderItemId, and action are required" }, { status: 400 });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify order belongs to the user
    if (order.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: This order does not belong to you" }, { status: 403 });
    }

    const orderItem = await OrderItem.findById(orderItemId);
    if (!orderItem) {
      return NextResponse.json({ error: "Order item not found" }, { status: 404 });
    }

    if (orderItem.substituteStatus !== "extra_amount_requested" || !orderItem.substitutedWith) {
      return NextResponse.json({ error: "No active substitute confirmation is pending for this item" }, { status: 400 });
    }

    const userId = order.userId;
    const substituteVariant = await GroceryVariant.findById(orderItem.substitutedWith.variantId);
    if (!substituteVariant) {
      return NextResponse.json({ error: "Substitute product variant is no longer available" }, { status: 404 });
    }

    const extraAmount = (orderItem.substitutedWith.price! - orderItem.price.sellingPrice) * orderItem.quantity;

    if (action === "approve") {
      let wallet = await Wallet.findOne({ user: userId, role: "user" });
      if (!wallet || wallet.balance < extraAmount) {
        return NextResponse.json({
          error: `Insufficient wallet balance. You need ₹${extraAmount.toFixed(2)} to approve, but your wallet balance is ₹${wallet ? wallet.balance.toFixed(2) : "0.00"}. Please add money to your wallet.`
        }, { status: 400 });
      }

      // Check stock of substitute again
      if (substituteVariant.countInStock < orderItem.quantity) {
        return NextResponse.json({ error: "Substitute variant is out of stock in dark store" }, { status: 400 });
      }

      // Process wallet debit
      wallet.balance -= extraAmount;
      await wallet.save();

      await WalletTransaction.create({
        walletId: wallet._id,
        type: "debit",
        amount: extraAmount,
        description: `Payment for substitute upgrade: ${orderItem.substitutedWith.name}`,
        status: "completed",
        referenceId: order._id.toString(),
      });

      // Update stock
      substituteVariant.countInStock -= orderItem.quantity;
      await substituteVariant.save();

      await GroceryVariant.findByIdAndUpdate(orderItem.variant.variantId, {
        $inc: { countInStock: orderItem.quantity },
      });

      // Confirm substitution
      orderItem.substituteStatus = "substituted";
      await orderItem.save();

      // Update order totals
      order.finalTotal += extraAmount;
      order.walletDeduction = (order.walletDeduction || 0) + extraAmount;
      await order.save();

    } else if (action === "reject") {
      // Refund original amount and cancel the item
      orderItem.substituteStatus = "out_of_stock_refunded";
      await orderItem.save();

      const refundAmount = orderItem.price.sellingPrice * orderItem.quantity;
      let wallet = await Wallet.findOne({ user: userId, role: "user" });
      if (!wallet) {
        wallet = await Wallet.create({ user: userId, role: "user", balance: 0 });
      }
      wallet.balance += refundAmount;
      await wallet.save();

      await WalletTransaction.create({
        walletId: wallet._id,
        type: "credit",
        amount: refundAmount,
        description: `Refund for rejected substitute of item: ${orderItem.groceryName}`,
        status: "completed",
        referenceId: order._id.toString(),
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Trigger socket status update
    try {
      const { getIO } = await import("@/lib/server/socket");
      const ioClient = getIO();
      if (ioClient) {
        ioClient.emit("order_status_update", {
          orderId: order._id.toString(),
          status: order.orderStatus,
          timestamp: new Date(),
        });
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Resolve Substitute API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
