// src/app/api/admin/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { auth } from "@/auth";

export const GET = async (req: NextRequest) => {
  try {
    await connectDb();

    /* ================= AUTH ================= */
    const session = await auth();
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

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

    /* ================= FILTER BUILD ================= */
    const filter: any = {};

    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (userId) filter.userId = userId;
    if (deliveryPartner) filter.deliveryPartner = deliveryPartner;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.orderNumber = { $regex: search, $options: "i" };
    }

    /* ================= QUERY ================= */
    const orders = await Order.find(filter)
      .populate("userId", "name email mobileNumber")
      .populate("deliveryPartner", "name mobileNumber")
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
