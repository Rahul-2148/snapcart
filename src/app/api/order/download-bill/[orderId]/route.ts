// src/app/api/order/download-bill/[orderId]/route.ts
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { ReturnRequest } from "@/models/returnRequest.model";
import "@/models/orderItem.model";
import { NextRequest, NextResponse } from "next/server";
import { generateInvoicePdf } from "@/lib/server/invoice";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) => {
  try {
    const { orderId } = await params;

    await connectDb();

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // Check if order belongs to user
    if (order.userId.toString() !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Only allow download if order is delivered
    if (order.orderStatus !== "delivered") {
      return NextResponse.json(
        { message: "Bill can only be downloaded for delivered orders" },
        { status: 400 }
      );
    }

    // Check if order has completed returns
    const completedReturn = await ReturnRequest.findOne({
      order: orderId,
      status: "completed",
    });

    if (completedReturn) {
      return NextResponse.json(
        { message: "Bill cannot be downloaded for orders with completed returns" },
        { status: 400 }
      );
    }

    // Generate the professional double-page PDF using our helper
    const pdfBuffer = await generateInvoicePdf(orderId);

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bill-${order.orderNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating bill:", error);
    return NextResponse.json(
      { message: `Error generating bill: ${error.message}` },
      { status: 500 }
    );
  }
};
