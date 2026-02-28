// src/app/api/admin/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { ReturnRequest } from "@/models/returnRequest.model";
import { auth } from "@/auth";

export const GET = async (req: NextRequest) => {
  try {
    await connectDb();

    /* ================= AUTH ================= */
    const session = await auth();
    if (!session || !session.user || !session.user.roles?.includes("admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    const orderStatus = searchParams.get("orderStatus"); // pending, confirmed, packed, shipped...
    const paymentStatus = searchParams.get("paymentStatus"); // pending, paid, failed
    const paymentMethod = searchParams.get("paymentMethod"); // cod | online
    const userId = searchParams.get("userId");
    const deliveryPartner = searchParams.get("deliveryPartner");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search") || "";
    const filterType = searchParams.get("filter") || "all";

    /* ================= FILTER BUILD ================= */
    const filter: any = {};

    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (userId) filter.userId = userId;
    if (deliveryPartner) filter.assignedDeliveryPartner = deliveryPartner;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.orderNumber = { $regex: search, $options: "i" };
    }

    // Apply return/refund filters
    if (filterType === "with-returns" || filterType === "with-refunds" || filterType === "pending-returns") {
      // Get returns based on filter type
      const returnQuery: any = {};

      if (filterType === "with-returns") {
        returnQuery.status = { $in: ["pending", "approved", "in-transit", "received", "completed"] };
      } else if (filterType === "with-refunds") {
        returnQuery.status = "completed";
        returnQuery.requestType = "return";
      } else if (filterType === "pending-returns") {
        returnQuery.status = "pending";
      }

      const returns = await ReturnRequest.find(returnQuery).select("order");
      const returnOrderIds = returns.map((r: any) => r.order);

      if (returnOrderIds.length === 0) {
        // No orders with returns, return empty result
        return NextResponse.json(
          {
            success: true,
            page,
            limit,
            totalOrders: 0,
            totalPages: 0,
            orders: [],
          },
          { status: 200 }
        );
      }

      filter._id = { $in: returnOrderIds };
    }

    /* ================= QUERY ================= */
    const orders = await Order.find(filter)
      .populate("userId", "name email mobileNumber")
      .populate("assignedDeliveryPartner", "name mobileNumber")
      .populate({
        path: "orderItems",
        populate: {
          path: "grocery",
          select: "images",
        },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalOrders = await Order.countDocuments(filter);

    return NextResponse.json(
      {
        success: true,
        page,
        limit,
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        orders,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin Orders Error:", error);
    return NextResponse.json(
      { success: false, message: `Admin orders error: ${error}` },
      { status: 500 }
    );
  }
};
