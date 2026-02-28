// src/app/api/admin/returns/analytics/route.ts
import { auth } from "@/auth";
import { ReturnRequest } from "@/models/returnRequest.model";
import connectDb from "@/lib/server/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDb();

    // Get date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total returns count
    const totalReturns = await ReturnRequest.countDocuments();

    // Returns by status
    const returnsByStatus = await ReturnRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Returns by reason
    const returnsByReason = await ReturnRequest.aggregate([
      {
        $group: {
          _id: "$reason",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Returns by type (return vs replacement)
    const returnsByType = await ReturnRequest.aggregate([
      {
        $group: {
          _id: "$requestType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Recent returns (last 30 days)
    const recentReturns = await ReturnRequest.countDocuments({
      requestedAt: { $gte: thirtyDaysAgo },
    });

    // Last 7 days returns
    const lastWeekReturns = await ReturnRequest.countDocuments({
      requestedAt: { $gte: sevenDaysAgo },
    });

    // Pending returns (requiring action)
    const pendingReturns = await ReturnRequest.countDocuments({
      status: "pending",
    });

    // Approved returns awaiting pickup
    const awaitingPickup = await ReturnRequest.countDocuments({
      status: "approved",
      deliveryPartner: { $exists: false },
    });

    // Completed returns (last 30 days)
    const completedReturns = await ReturnRequest.countDocuments({
      status: "completed",
      completedAt: { $gte: thirtyDaysAgo },
    });

    // Refund amount stats (last 30 days)
    const refundStats = await ReturnRequest.aggregate([
      {
        $match: {
          status: "completed",
          "refund.amount": { $exists: true },
          completedAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: "$refund.amount" },
          avgRefund: { $avg: "$refund.amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Return rate calculation (returns vs total orders - simplified)
    // In production, you'd need to fetch total orders and calculate
    const returnRate =
      totalReturns > 0 ? ((recentReturns / totalReturns) * 100).toFixed(2) : 0;

    // Returns trend (last 7 days daily breakdown)
    const returnsTrend = await ReturnRequest.aggregate([
      {
        $match: {
          requestedAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$requestedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return NextResponse.json({
      summary: {
        totalReturns,
        recentReturns,
        lastWeekReturns,
        pendingReturns,
        awaitingPickup,
        completedReturns,
        returnRate,
      },
      refundStats: refundStats[0] || {
        totalRefunded: 0,
        avgRefund: 0,
        count: 0,
      },
      returnsByStatus: returnsByStatus.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      returnsByReason: returnsByReason.map((item: any) => ({
        reason: item._id,
        count: item.count,
      })),
      returnsByType: returnsByType.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      returnsTrend: returnsTrend.map((item: any) => ({
        date: item._id,
        count: item.count,
      })),
    });
  } catch (error) {
    console.error("Returns analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
