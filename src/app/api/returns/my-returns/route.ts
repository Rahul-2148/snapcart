// src/app/api/returns/my-returns/route.ts
import { auth } from "@/auth";
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
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build query
    const query: any = {};

    // Get orders for this user first
    const userOrders = await Order.find({ userId: session.user.id });
    const orderIds = userOrders.map((o) => o._id);

    if (orderIds.length === 0) {
      return NextResponse.json({
        returns: [],
        total: 0,
        page,
        pages: 0,
      });
    }

    query.order = { $in: orderIds };

    if (status) {
      query.status = status;
    }

    // Fetch returns with pagination
    const total = await ReturnRequest.countDocuments(query);
    const returns = await ReturnRequest.find(query)
      .populate([
        { path: "order", select: "orderNumber finalTotal currency" },
        { path: "orderItem", select: "groceryName" },
        { path: "grocery", select: "name" },
      ])
      .sort({ requestedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      returns,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching returns:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 }
    );
  }
}
