// src/app/api/store-manager/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";
import { Order } from "@/models/order.model";
import "@/models/orderItem.model";
import "@/models/grocery.model";
import "@/models/groceryVariant.model";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const isManager = session?.user?.roles?.includes("storeManager");
    const isAdmin = session?.user?.roles?.includes("admin");

    if (!session || (!isManager && !isAdmin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    // Find store managed by this user
    const query = isAdmin ? {} : { manager: session.user.id };
    const store = await Store.findOne(query);

    if (!store) {
      return NextResponse.json(
        { error: "No store assigned to this manager account" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";

    const orderQuery: any = { storeId: store._id };
    if (status !== "all") {
      orderQuery.orderStatus = status;
    }

    const orders = await Order.find(orderQuery)
      .sort({ createdAt: -1 })
      .populate("userId", "name email mobileNumber")
      .populate({
        path: "orderItems",
        populate: [
          { path: "grocery", select: "name image images" },
          { path: "variant", select: "label price" },
        ],
      })
      .lean();

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("GET Store Manager Orders Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const isManager = session?.user?.roles?.includes("storeManager");
    const isAdmin = session?.user?.roles?.includes("admin");

    if (!session || (!isManager && !isAdmin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "OrderId and status are required" },
        { status: 400 }
      );
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify manager controls this store (admins can update any)
    if (!isAdmin) {
      const store = await Store.findOne({ manager: session.user.id });
      if (!store || order.storeId?.toString() !== store._id.toString()) {
        return NextResponse.json(
          { error: "Forbidden: This order does not belong to your store" },
          { status: 403 }
        );
      }
    }

    // Update status and corresponding timestamps
    order.orderStatus = status;
    const now = new Date();
    if (status === "confirmed") {
      order.confirmedAt = now;
    } else if (status === "packed") {
      order.packedAt = now;
    } else if (status === "shipped") {
      order.shippedAt = now;
    } else if (status === "out-for-delivery") {
      order.outForDeliveryAt = now;
    } else if (status === "delivered") {
      order.deliveredAt = now;
    } else if (status === "cancelled") {
      order.cancelledAt = now;
    }

    await order.save();

    // Trigger real-time socket notification to customer and order rooms
    try {
      const { getIO } = await import("@/lib/server/socket");
      const ioClient = getIO();
      if (ioClient) {
        ioClient.emit("delivery_status_update", {
          customerId: order.userId.toString(),
          orderId: order._id.toString(),
          status: order.orderStatus,
          timestamp: new Date(),
        });
      }
    } catch (socketErr) {
      console.error("Socket emit error on order status update:", socketErr);
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("PUT Store Manager Orders Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
