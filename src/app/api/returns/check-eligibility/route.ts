// src/app/api/returns/check-eligibility/route.ts
import { auth } from "@/auth";
import { ReturnPolicy } from "@/models/returnPolicy.model";
import { ReturnRequest } from "@/models/returnRequest.model";
import { Order } from "@/models/order.model";
import connectDb from "@/lib/server/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const orderItemId = searchParams.get("orderItemId");
    const groceryId = searchParams.get("groceryId");

    if (!orderId || !orderItemId || !groceryId) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 },
      );
    }

    // Get order to check delivery status
    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if user owns this order
    if (order.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if order is delivered (tolerate missing deliveredAt if status is delivered)
    const deliveredAt =
      order.deliveredAt ||
      (order.orderStatus === "delivered" ? order.updatedAt || order.createdAt : null);

    if (order.orderStatus !== "delivered" || !deliveredAt) {
      return NextResponse.json(
        {
          canReturn: false,
          reason: "Order not yet delivered",
        },
        { status: 200 },
      );
    }

    // Get return policy
    const policy = await ReturnPolicy.findOne({
      grocery: groceryId,
      isActive: true,
    });

    if (!policy || !policy.isReturnable) {
      return NextResponse.json(
        {
          canReturn: false,
          reason: "This product is not returnable",
        },
        { status: 200 },
      );
    }

    // Check if there is already an active/pending return for this order item
    const pendingReturn = await ReturnRequest.findOne({
      orderItem: orderItemId,
      status: { $in: ["pending", "approved", "in-transit", "received", "completed"] },
    });

    if (pendingReturn) {
      return NextResponse.json(
        {
          canReturn: false,
          reason: pendingReturn.status === "completed" 
            ? "Return already completed - refund processed" 
            : "A return/replacement request is already in progress",
          existingReturnId: pendingReturn._id,
          existingReturnStatus: pendingReturn.status,
        },
        { status: 200 },
      );
    }

    // Check return window
    const daysSinceDelivery = Math.floor(
      (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceDelivery > policy.returnWindowDays) {
      return NextResponse.json(
        {
          canReturn: false,
          reason: `Return window of ${policy.returnWindowDays} days has expired`,
          daysRemaining: 0,
          returnWindowDays: policy.returnWindowDays,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        canReturn: true,
        policy,
        daysRemaining: policy.returnWindowDays - daysSinceDelivery,
        returnWindowDays: policy.returnWindowDays,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Check eligibility error:", error);
    return NextResponse.json(
      { error: "Failed to check return eligibility" },
      { status: 500 },
    );
  }
}
