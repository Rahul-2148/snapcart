// src/app/api/admin/order/assign-delivery/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { User } from "@/models/user.model";
import Notification from "@/models/notification.model"; // Import Notification model
import { sendNotification } from "@/lib/server/socket"; // Import sendNotification
import { auth } from "@/auth";

export const POST = async (req: NextRequest) => {
  try {
    await connectDb();

    const session = await auth();
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { orderId, deliveryPartnerId } = await req.json();

    if (!orderId || !deliveryPartnerId) {
      return NextResponse.json(
        { message: "orderId and deliveryPartnerId required" },
        { status: 400 }
      );
    }

    const order = await Order.findById(orderId);
    if (!order)
      return NextResponse.json({ message: "Order not found" }, { status: 404 });

    if (["cancelled", "delivered"].includes(order.orderStatus)) {
      return NextResponse.json(
        { message: "Cannot assign delivery partner to this order" },
        { status: 400 }
      );
    }

    const deliveryPartner = await User.findById(deliveryPartnerId);
    if (!deliveryPartner || deliveryPartner.role !== "delivery") {
      return NextResponse.json(
        { message: "Invalid delivery partner" },
        { status: 400 }
      );
    }

    /* ================= ASSIGN ================= */
    order.deliveryPartner = deliveryPartnerId;

    // Assigning delivery usually means "out-for-delivery"
    order.orderStatus = "out-for-delivery";
    order.outForDeliveryAt = new Date();

    await order.save();

    // Create and send notification to the assigned delivery partner
    try {
        const newNotification = await Notification.create({
            recipient: deliveryPartnerId,
            type: "order",
            message: `You have been assigned to order #${order.orderNumber}.`,
            link: `/delivery/orders?orderId=${order._id}`, // Optional: Link to the order details for delivery partner
            read: false,
            createdAt: new Date(),
        });
        await sendNotification(deliveryPartnerId, newNotification);
    } catch (notificationError) {
        console.error("Error sending order assignment notification to delivery partner:", notificationError);
        // Do not block order assignment if notification fails
    }

    return NextResponse.json(
      { success: true, message: "Delivery partner assigned", order },
      { status: 200 }
    );
  } catch (error) {
    console.error("Assign Delivery Error:", error);
    return NextResponse.json(
      { success: false, message: `Assign delivery error: ${error}` },
      { status: 500 }
    );
  }
};
