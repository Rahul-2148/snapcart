import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { auth } from "@/auth";
import mongoose from "mongoose";
import "@/models/orderItem.model";

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
    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error(`PATCH order ${id} error:`, error);
    return NextResponse.json(
      { success: false, message: `Failed to update order status: ${error}` },
      { status: 500 }
    );
  }
}
