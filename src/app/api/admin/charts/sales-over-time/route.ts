// src/app/api/admin/charts/sales-over-time/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          totalSales: { $sum: "$finalTotal" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: 1, // Sort by date in ascending order
        },
      },
      {
        $project: {
            _id: 0,
            date: "$_id",
            sales: "$totalSales"
        }
      }
    ]);

    return NextResponse.json({ success: true, salesData });
  } catch (error: any) {
    console.error("Sales chart error:", error);
    return NextResponse.json(
      { success: false, message: `Sales chart error: ${error.message}` },
      { status: 500 }
    );
  }
}
