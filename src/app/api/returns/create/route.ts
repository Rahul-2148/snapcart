// src/app/api/returns/create/route.ts
import { auth } from "@/auth";
import { ReturnRequest } from "@/models/returnRequest.model";
import { ReturnPolicy } from "@/models/returnPolicy.model";
import { OrderItem } from "@/models/orderItem.model";
import { Order } from "@/models/order.model";
import connectDb from "@/lib/server/db";
import { NextRequest, NextResponse } from "next/server";
import getSocketClient from "@/lib/server/socket";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const {
      orderId,
      orderItemId,
      requestType, // "return" or "replacement"
      reason,
      description,
      images,
    } = await req.json();

    // Validate request type
    if (!["return", "replacement"].includes(requestType)) {
      return NextResponse.json(
        { error: "Invalid request type" },
        { status: 400 },
      );
    }

    // Get order and order item
    const order = await Order.findById(orderId);
    if (!order || order.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderItem = await OrderItem.findById(orderItemId);
    if (!orderItem || orderItem.order.toString() !== orderId) {
      return NextResponse.json(
        { error: "Order item not found" },
        { status: 404 },
      );
    }

    // Check return policy
    const returnPolicy = await ReturnPolicy.findOne({
      grocery: orderItem.grocery,
      isActive: true,
    });

    if (!returnPolicy || !returnPolicy.isReturnable) {
      return NextResponse.json(
        { error: "This product is not returnable" },
        { status: 400 },
      );
    }

    // Check if return window is still open
    if (order.deliveredAt) {
      const daysSinceDelivery = Math.floor(
        (Date.now() - order.deliveredAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceDelivery > returnPolicy.returnWindowDays) {
        return NextResponse.json(
          {
            error: `Return window of ${returnPolicy.returnWindowDays} days has expired`,
            daysSinceDelivery,
            returnWindowDays: returnPolicy.returnWindowDays,
          },
          { status: 400 },
        );
      }
    }

    // Check policy type matches request type
    if (
      requestType === "return" &&
      returnPolicy.policyType === "replacement-only"
    ) {
      return NextResponse.json(
        { error: "Only replacement is allowed for this product" },
        { status: 400 },
      );
    }

    if (
      requestType === "replacement" &&
      returnPolicy.policyType === "return-only"
    ) {
      return NextResponse.json(
        { error: "Only return is allowed for this product" },
        { status: 400 },
      );
    }

    // Create return request
    const returnRequest = new ReturnRequest({
      order: orderId,
      orderItem: orderItemId,
      user: session.user.id,
      grocery: orderItem.grocery,
      requestType,
      reason,
      description,
      images: images || [],
      status: "pending",
    });

    await returnRequest.save();

    // Emit real-time notification to admin
    try {
      const ioClient = getSocketClient();
      const populatedReturn = await returnRequest.populate([
        "order",
        "orderItem",
        "user",
        "grocery",
      ]);
      (ioClient as any).emit("return:created", {
        returnId: returnRequest._id,
        orderId,
        orderItemId,
        userId: session.user.id,
        requestType,
        reason,
        status: "pending",
        createdAt: new Date(),
        data: populatedReturn,
      });
    } catch (error) {
      console.error("Error emitting socket event:", error);
    }

    return NextResponse.json(
      {
        message: "Return request created successfully",
        returnRequest,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Return creation error:", error);
    return NextResponse.json(
      { error: "Failed to create return request" },
      { status: 500 },
    );
  }
}
