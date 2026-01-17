// src/app/api/admin/order/update-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { User } from "@/models/user.model";
import { auth } from "@/auth";
import { sendOrderStatusEmail } from "@/lib/server/email";

export const PATCH = async (req: NextRequest) => {
  try {
    await connectDb();

    const session = await auth();
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { orderId, orderStatus } = await req.json();

    if (!orderId || !orderStatus) {
      return NextResponse.json(
        { message: "orderId and orderStatus are required" },
        { status: 400 }
      );
    }

    const validStatuses = [
      "confirmed",
      "packed",
      "shipped",
      "out-for-delivery",
      "delivered",
    ];
    if (!validStatuses.includes(orderStatus)) {
      return NextResponse.json(
        { message: "Invalid order status" },
        { status: 400 }
      );
    }

    const order = await Order.findById(orderId);
    if (!order)
      return NextResponse.json({ message: "Order not found" }, { status: 404 });

    /* ================= PREVENT BACKWARD TRANSITIONS ================= */
    const statusFlow = [
      "pending",
      "confirmed",
      "packed",
      "shipped",
      "out-for-delivery",
      "delivered",
    ];
    const currentIndex = statusFlow.indexOf(order.orderStatus);
    const newIndex = statusFlow.indexOf(orderStatus);

    if (newIndex <= currentIndex) {
      return NextResponse.json(
        { message: "Invalid order status transition" },
        { status: 400 }
      );
    }

    /* ================= UPDATE STATUS & TIMESTAMPS ================= */
    order.orderStatus = orderStatus;

    if (orderStatus === "confirmed") order.confirmedAt = new Date();
    if (orderStatus === "packed") order.packedAt = new Date();
    if (orderStatus === "shipped") order.shippedAt = new Date();
    if (orderStatus === "out-for-delivery") order.outForDeliveryAt = new Date();
    if (orderStatus === "delivered") order.deliveredAt = new Date();

    await order.save();

    // Send email notification to user about status change
    try {
      const user = await User.findById(order.userId);
      if (user && user.email) {
        const statusMessages: Record<string, string> = {
          confirmed: `Great news! Your order has been confirmed and is being prepared. We'll notify you once it's packed.`,
          packed: `Your order has been packed and is ready for shipment. It will be shipped soon!`,
          shipped: `Your order is on its way! It has been shipped and should arrive soon.`,
          "out-for-delivery": `Your order is out for delivery! Our delivery partner will reach you shortly.`,
          delivered: `Your order has been delivered! We hope you enjoy your purchase. Thank you for shopping with SnapCart!`,
        };

        await sendOrderStatusEmail(
          user.email,
          user.name,
          order.orderNumber,
          orderStatus,
          statusMessages[orderStatus] || `Your order status has been updated to ${orderStatus}.`
        );
      }
    } catch (emailError) {
      console.error("Error sending order status email:", emailError);
      // Don't fail the status update if email fails
    }

    return NextResponse.json(
      { success: true, message: "Order status updated", order },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update Order Status Error:", error);
    return NextResponse.json(
      { success: false, message: `Update status error: ${error}` },
      { status: 500 }
    );
  }
};
