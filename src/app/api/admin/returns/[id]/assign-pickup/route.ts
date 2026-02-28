// src/app/api/admin/returns/[id]/assign-pickup/route.ts
import { auth } from "@/auth";
import { ReturnRequest } from "@/models/returnRequest.model";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { Order } from "@/models/order.model";
import connectDb from "@/lib/server/db";
import { NextRequest, NextResponse } from "next/server";
import getSocketClient from "@/lib/server/socket";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDb();

    const { id } = await params;
    const { deliveryPartnerId, pickupScheduledAt } = await req.json();

    if (!deliveryPartnerId) {
      return NextResponse.json(
        { error: "Delivery partner ID is required" },
        { status: 400 },
      );
    }

    const returnRequest = await ReturnRequest.findById(id);
    if (!returnRequest) {
      return NextResponse.json(
        { error: "Return request not found" },
        { status: 404 },
      );
    }

    // Verify delivery partner exists and is available
    const deliveryPartner = await DeliveryPartner.findById(deliveryPartnerId);
    if (!deliveryPartner) {
      return NextResponse.json(
        { error: "Delivery partner not found" },
        { status: 404 },
      );
    }

    // Get order to fetch delivery address
    const order = await Order.findById(returnRequest.order).populate("address");
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update return request with pickup assignment
    returnRequest.deliveryPartner = deliveryPartnerId;
    returnRequest.pickupScheduledAt = pickupScheduledAt
      ? new Date(pickupScheduledAt)
      : new Date();
    returnRequest.pickupLocation = {
      address: order.address?.address || "N/A",
      coordinates: order.address?.location?.coordinates || [0, 0],
    };

    // Update status to approved if still pending
    if (returnRequest.status === "pending") {
      returnRequest.status = "approved";
      returnRequest.approvedAt = new Date();
    }

    await returnRequest.save();

    // Emit socket events via server-side socket client: send admin events to socket-server
    // socket-server will forward to the appropriate target socket/room
    const socket = getSocketClient();
    let populatedReturn: any = null;
    try {
      if (socket && deliveryPartner.socketId) {
        socket.emit("admin:pickup_assigned", {
          targetSocketId: deliveryPartner.socketId,
          payload: {
            returnId: returnRequest._id,
            orderId: order._id,
            orderNumber: order.orderNumber,
            pickupLocation: returnRequest.pickupLocation,
            pickupScheduledAt: returnRequest.pickupScheduledAt,
          },
        });
      }

      // Emit notification to user via socket-server forwarding
      populatedReturn = await ReturnRequest.findById(id).populate([
        "user",
        "deliveryPartner",
        "order",
        "grocery",
      ]);
      const user = populatedReturn?.user as any;
      if (socket && user?.socketId) {
        socket.emit("admin:return_pickup_assigned", {
          targetSocketId: user.socketId,
          payload: {
            returnId: returnRequest._id,
            deliveryPartnerName: deliveryPartner.name,
            pickupScheduledAt: returnRequest.pickupScheduledAt,
          },
        });
      }
    } catch (e) {
      console.error("Socket emit error (admin assign):", e);
    }

    return NextResponse.json({
      message: "Pickup assigned successfully",
      returnRequest: populatedReturn,
    });
  } catch (error) {
    console.error("Assign pickup error:", error);
    return NextResponse.json(
      { error: "Failed to assign pickup" },
      { status: 500 },
    );
  }
}
