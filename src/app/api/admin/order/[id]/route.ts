import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { User } from "@/models/user.model";
import { auth } from "@/auth";
import mongoose from "mongoose";
import "@/models/orderItem.model";
import { sendOrderStatusEmail } from "@/lib/server/email";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id = "";
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const resolvedParams = await params;
    id = resolvedParams.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid order ID" },
        { status: 400 }
      );
    }
    await connectDb();
    const order = await Order.findById(id)
      .populate("userId", "name email")
      .populate({
        path: "orderItems",
        populate: [
          {
            path: "variant.variantId",
            select: "label"
          },
          {
            path: "grocery",
            select: "name images"
          }
        ]
      })
      .setOptions({ strictPopulate: false });
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error(`GET order ${id} error:`, error);
    return NextResponse.json(
      { success: false, message: `Failed to get order: ${error}` },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id = "";
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const resolvedParams = await params;
    id = resolvedParams.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid order ID" },
        { status: 400 }
      );
    }
    await connectDb();
    const { orderStatus } = await req.json();
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { orderStatus },
      { new: true }
    );
    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // Send email notification to user about status change
    try {
      const user = await User.findById(updatedOrder.userId);
      if (user && user.email) {
        const statusMessages: Record<string, string> = {
          confirmed: `Great news! Your order has been confirmed and is being prepared. We'll notify you once it's packed.`,
          packed: `Your order has been packed and is ready for shipment. It will be shipped soon!`,
          shipped: `Your order is on its way! It has been shipped and should arrive soon.`,
          "out-for-delivery": `Your order is out for delivery! Our delivery partner will reach you shortly.`,
          delivered: `Your order has been delivered! We hope you enjoy your purchase. Thank you for shopping with SnapCart!`,
          cancelled: `Your order has been cancelled. If you have any questions, please contact our support team.`,
        };

        await sendOrderStatusEmail(
          user.email,
          user.name,
          updatedOrder.orderNumber,
          orderStatus,
          statusMessages[orderStatus] || `Your order status has been updated to ${orderStatus}.`
        );
      }
    } catch (emailError) {
      console.error("Error sending order status email:", emailError);
      // Don't fail the status update if email fails
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error(`PATCH order ${id} error:`, error);
    return NextResponse.json(
      { success: false, message: `Failed to update order status: ${error}` },
      { status: 500 }
    );
  }
}
