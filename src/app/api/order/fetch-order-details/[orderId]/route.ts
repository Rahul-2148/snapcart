// src/app/api/order/fetch-order-details/[orderId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import "@/models/orderItem.model";
import "@/models/grocery.model";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) => {
  try {
    const { orderId } = await params;

    await connectDb();

    if (!orderId || orderId.trim() === "") {
      return NextResponse.json(
        { message: "Order ID is required" },
        { status: 400 }
      );
    }

    const order = await Order.findById(orderId.trim()).populate({
      path: "orderItems",
      populate: {
        path: "grocery",
        model: "Grocery",
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Get order error:", error);
    return NextResponse.json(
      { message: `Failed to get order: ${error.message}` },
      { status: 500 }
    );
  }
};
