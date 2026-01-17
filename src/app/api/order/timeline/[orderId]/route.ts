// src/app/api/order/timeline/[orderId]/route.ts (get order timeline)
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) => {
  try {
    await connectDb();

    const { orderId } = await params;
    const order = await Order.findById(orderId);

    if (!order)
      return NextResponse.json({ message: "Order not found" }, { status: 404 });

    const statusFlow = [
      "pending",
      "confirmed",
      "packed",
      "shipped",
      "out-for-delivery",
      "delivered",
    ];

    const currentIndex = statusFlow.indexOf(order.orderStatus);

    const timeline = [
      {
        status: "pending",
        label: "Order Placed",
        time: order.createdAt,
        completed: true,
      },
      {
        status: "confirmed",
        label: "Order Confirmed",
        time: order.confirmedAt,
        completed: currentIndex >= statusFlow.indexOf("confirmed"),
      },
      {
        status: "packed",
        label: "Packed",
        time: order.packedAt,
        completed: currentIndex >= statusFlow.indexOf("packed"),
      },
      {
        status: "shipped",
        label: "Shipped",
        time: order.shippedAt,
        completed: currentIndex >= statusFlow.indexOf("shipped"),
      },
      {
        status: "out-for-delivery",
        label: "Out for Delivery",
        time: order.outForDeliveryAt,
        completed: currentIndex >= statusFlow.indexOf("out-for-delivery"),
      },
      {
        status: "delivered",
        label: "Delivered",
        time: order.deliveredAt,
        completed: currentIndex >= statusFlow.indexOf("delivered"),
      },
    ];

    if (order.orderStatus === "cancelled") {
      timeline.push({
        status: "cancelled",
        label: "Order Cancelled",
        time: order.cancelledAt,
        completed: true,
      });
    }

    return NextResponse.json(
      { success: true, orderStatus: order.orderStatus, timeline },
      { status: 200 }
    );
  } catch (error) {
    console.error("Order Timeline Error:", error);
    return NextResponse.json(
      { success: false, message: `Timeline error: ${error}` },
      { status: 500 }
    );
  }
};
