import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { Order } from "@/models/order.model";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (session?.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "5");
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();

    const revenueResult = await Order.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: "$finalTotal" } } },
    ]);
    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    const recentOrders = await Order.find({})
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email");

    const totalRecentOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalRecentOrders / limit);

    return NextResponse.json(
      {
        totalUsers,
        totalOrders,
        totalRevenue,
        recentOrders,
        totalPages,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { message: `Error fetching dashboard stats: ${error.message}` },
      { status: 500 }
    );
  }
}
