// src/app/api/store-manager/orders/substitute/route.ts
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
    const isManager = session?.user?.roles?.includes("storeManager");
    const isAdmin = session?.user?.roles?.includes("admin");

    if (!session || (!isManager && !isAdmin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const body = await req.json();
    const { orderId, orderItemId, action, substituteVariantId } = body;

    if (!orderId || !orderItemId || !action) {
      return NextResponse.json({ error: "orderId, orderItemId, and action are required" }, { status: 400 });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderItem = await OrderItem.findById(orderItemId);
    if (!orderItem) {
      return NextResponse.json({ error: "Order item not found" }, { status: 404 });
    }

    if (action === "pack") {
      orderItem.substituteStatus = "original_packed";
      orderItem.isSubstituted = false;
      await orderItem.save();
      return NextResponse.json({ success: true, orderItem });
    }

    const userId = order.userId;

    if (action === "out_of_stock") {
      const option = orderItem.substituteOption || "none";

      if (option === "none") {
        // Refund full item cost to wallet
        orderItem.substituteStatus = "out_of_stock_refunded";
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
          description: `Refund for out-of-stock item: ${orderItem.groceryName}`,
          status: "completed",
          referenceId: order._id.toString(),
        });

        await orderItem.save();

        // Broadcast socket update
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

        return NextResponse.json({ success: true, orderItem });
      }

      // If user selected "similar" or "specific", handle substitution
      const varId = substituteVariantId || orderItem.substituteVariantId;
      if (!varId) {
        return NextResponse.json({ error: "No substitute variant specified or preselected" }, { status: 400 });
      }

      const substituteVariant = await GroceryVariant.findById(varId).populate("grocery");
      if (!substituteVariant) {
        return NextResponse.json({ error: "Substitute variant not found" }, { status: 404 });
      }

      // Check stock of substitute
      if (substituteVariant.countInStock < orderItem.quantity) {
        return NextResponse.json({ error: "Substitute variant is out of stock in dark store" }, { status: 400 });
      }

      const originalItemPrice = orderItem.price.sellingPrice * orderItem.quantity;
      const substituteItemPrice = substituteVariant.price * orderItem.quantity;
      const priceDifference = substituteItemPrice - originalItemPrice;

      const subbedData = {
        variantId: substituteVariant._id,
        label: substituteVariant.label,
        price: substituteVariant.price,
        name: `${(substituteVariant.grocery as any).name} - ${substituteVariant.label}`,
      };

      if (priceDifference <= 0) {
        // Cheaper substitute: process auto-refund to wallet
        orderItem.isSubstituted = true;
        orderItem.substituteStatus = "substituted";
        orderItem.substitutedWith = subbedData;

        // Decrement substitute stock, increment original stock
        substituteVariant.countInStock -= orderItem.quantity;
        await substituteVariant.save();

        await GroceryVariant.findByIdAndUpdate(orderItem.variant.variantId, {
          $inc: { countInStock: orderItem.quantity },
        });

        const refundAmount = Math.abs(priceDifference);
        if (refundAmount > 0) {
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
            description: `Refund for cheaper substitute: ${subbedData.name}`,
            status: "completed",
            referenceId: order._id.toString(),
          });
        }

        await orderItem.save();
      } else {
        // More expensive substitute: request extra amount approval
        orderItem.isSubstituted = true;
        orderItem.substituteStatus = "extra_amount_requested";
        orderItem.substitutedWith = subbedData;
        
        await orderItem.save();
      }

      // Trigger socket event
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

      return NextResponse.json({ success: true, orderItem });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Substitute API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
