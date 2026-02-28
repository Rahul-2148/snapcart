import mongoose from "mongoose";

import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { Banner } from "@/models/banner.model";
import Notification from "@/models/notification.model";
import { Order } from "@/models/order.model";
import { Payment } from "@/models/payment.model";
import { ReturnRequest } from "@/models/returnRequest.model";
import { User } from "@/models/user.model";

import { getQuickActionsForRole } from "./knowledge";
import { RoleAwareContext, SnapcartRole } from "./types";

function toObjectId(id: string) {
  return new mongoose.Types.ObjectId(id);
}

function getStartOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function toFixedNumber(value: number, decimals = 2) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(decimals));
}

function toPercent(current: number, previous: number) {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }
  return toFixedNumber(((current - previous) / previous) * 100, 1);
}

async function getGlobalStats() {
  const [totalOrders, openOrders, pendingReturns] = await Promise.all([
    Order.countDocuments({}),
    Order.countDocuments({
      orderStatus: { $in: ["pending", "confirmed", "packed", "shipped", "out-for-delivery"] },
    }),
    ReturnRequest.countDocuments({ status: { $in: ["pending", "approved", "in-transit"] } }),
  ]);

  return { totalOrders, openOrders, pendingReturns };
}

async function getUserStats(userId: string) {
  const uid = toObjectId(userId);

  type RecentOrderSummary = {
    orderNumber?: string;
    orderStatus?: string;
  };

  const [recentOrders, unreadNotifications, activeReturns] = await Promise.all([
    Order.find({ userId: uid })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber orderStatus finalTotal createdAt")
      .lean<RecentOrderSummary[]>(),
    Notification.countDocuments({ recipient: uid, read: false }),
    ReturnRequest.countDocuments({
      user: uid,
      status: { $in: ["pending", "approved", "in-transit", "received"] },
    }),
  ]);

  return {
    unreadNotifications,
    activeReturns,
    recentOrders: recentOrders.map((order) => `${order.orderNumber || "N/A"}:${order.orderStatus || "pending"}`),
  };
}

async function getDeliveryStats(userId: string) {
  const uid = toObjectId(userId);
  const todayStart = getStartOfDay();
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  type ActiveAssignmentSummary = {
    orderNumber?: string;
    status?: string;
    priority?: "high" | "normal" | "low";
  };

  const [
    assigned,
    pickedUp,
    onTheWay,
    deliveredToday,
    pendingOtp,
    overdueAssignments,
    highPriorityActive,
    cancelledToday,
    earningsTodayAgg,
    avgLegAgg,
    activeAssignments,
  ] = await Promise.all([
    DeliveryAssignment.countDocuments({ assignedTo: uid, status: "assigned" }),
    DeliveryAssignment.countDocuments({ assignedTo: uid, status: "picked_up" }),
    DeliveryAssignment.countDocuments({ assignedTo: uid, status: "on_the_way" }),
    DeliveryAssignment.countDocuments({
      assignedTo: uid,
      status: "delivered",
      deliveredAt: { $gte: todayStart },
    }),
    DeliveryAssignment.countDocuments({
      assignedTo: uid,
      status: { $in: ["assigned", "picked_up", "on_the_way"] },
      otpVerifiedAt: null,
    }),

    DeliveryAssignment.countDocuments({
      assignedTo: uid,
      status: { $in: ["assigned", "picked_up"] },
      updatedAt: { $lte: thirtyMinutesAgo },
    }),

    DeliveryAssignment.countDocuments({
      assignedTo: uid,
      status: { $in: ["assigned", "picked_up", "on_the_way"] },
      priority: "high",
    }),

    DeliveryAssignment.countDocuments({
      assignedTo: uid,
      status: "cancelled",
      updatedAt: { $gte: todayStart },
    }),

    DeliveryAssignment.aggregate([
      {
        $match: {
          assignedTo: uid,
          status: "delivered",
          deliveredAt: { $gte: todayStart },
        },
      },
      {
        $group: {
          _id: null,
          totalReward: { $sum: "$rewardAmount" },
        },
      },
    ]),

    DeliveryAssignment.aggregate([
      {
        $match: {
          assignedTo: uid,
          status: "delivered",
          deliveredAt: { $gte: todayStart, $ne: null },
          pickedUpAt: { $ne: null },
          acceptedAt: { $ne: null },
        },
      },
      {
        $project: {
          pickupToDropMinutes: {
            $divide: [{ $subtract: ["$deliveredAt", "$pickedUpAt"] }, 1000 * 60],
          },
          acceptToPickupMinutes: {
            $divide: [{ $subtract: ["$pickedUpAt", "$acceptedAt"] }, 1000 * 60],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgPickupToDropMinutes: { $avg: "$pickupToDropMinutes" },
          avgAcceptToPickupMinutes: { $avg: "$acceptToPickupMinutes" },
        },
      },
    ]),

    DeliveryAssignment.find({
      assignedTo: uid,
      status: { $in: ["assigned", "picked_up", "on_the_way"] },
    })
      .sort({ priority: -1, updatedAt: -1 })
      .limit(5)
      .select("orderNumber status priority")
      .lean<ActiveAssignmentSummary[]>(),
  ]);

  const earningsToday = earningsTodayAgg?.[0]?.totalReward || 0;
  const avgPickupToDropMinutes = avgLegAgg?.[0]?.avgPickupToDropMinutes || 0;
  const avgAcceptToPickupMinutes = avgLegAgg?.[0]?.avgAcceptToPickupMinutes || 0;

  return {
    assigned,
    pickedUp,
    onTheWay,
    deliveredToday,
    pendingOtp,
    overdueAssignments,
    highPriorityActive,
    cancelledToday,
    earningsToday: toFixedNumber(earningsToday, 2),
    avgPickupToDropMinutes: toFixedNumber(avgPickupToDropMinutes, 1),
    avgAcceptToPickupMinutes: toFixedNumber(avgAcceptToPickupMinutes, 1),
    activeAssignments: activeAssignments.map(
      (item) => `${item.orderNumber || "N/A"}:${item.status || "assigned"}:${item.priority || "normal"}`,
    ),
  };
}

async function getAdminStats() {
  const todayStart = getStartOfDay();
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [
    ordersByStatus,
    pendingRoleRequests,
    activePartners,
    highPriorityAssignments,
    todayOrderAgg,
    yesterdayOrderAgg,
    paymentStatusAgg,
    failedPaymentsToday,
    returnBacklogOver48h,
    deliveryTimingAgg,
    cancellationReasonAgg,
    totalBanners,
    activeBanners,
    inactiveBanners,
    latestBanner,
    topBannerLinks,
  ] = await Promise.all([
    Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]),
    User.countDocuments({ roleChangeRequest: "pending" }),
    User.countDocuments({ roles: "deliveryBoy", isBlocked: { $ne: true } }),
    DeliveryAssignment.countDocuments({ status: "assigned", priority: "high" }),

    Order.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          gmv: { $sum: "$finalTotal" },
        },
      },
    ]),

    Order.aggregate([
      { $match: { createdAt: { $gte: yesterdayStart, $lt: todayStart } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          gmv: { $sum: "$finalTotal" },
        },
      },
    ]),

    Payment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    Payment.countDocuments({ status: "failed", createdAt: { $gte: todayStart } }),

    ReturnRequest.countDocuments({
      status: { $in: ["pending", "approved", "in-transit"] },
      requestedAt: { $lte: fortyEightHoursAgo },
    }),

    DeliveryAssignment.aggregate([
      {
        $match: {
          status: "delivered",
          deliveredAt: { $gte: todayStart, $ne: null },
          acceptedAt: { $ne: null },
          pickedUpAt: { $ne: null },
        },
      },
      {
        $project: {
          pickupMinutes: {
            $divide: [{ $subtract: ["$pickedUpAt", "$acceptedAt"] }, 1000 * 60],
          },
          deliveryMinutes: {
            $divide: [{ $subtract: ["$deliveredAt", "$pickedUpAt"] }, 1000 * 60],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgPickupMinutes: { $avg: "$pickupMinutes" },
          avgDeliveryMinutes: { $avg: "$deliveryMinutes" },
          deliveredCount: { $sum: 1 },
        },
      },
    ]),

    DeliveryAssignment.aggregate([
      {
        $match: {
          status: "cancelled",
          reasonForCancellation: { $ne: null },
          updatedAt: { $gte: yesterdayStart },
        },
      },
      {
        $group: {
          _id: "$reasonForCancellation",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]),

    Banner.countDocuments({}),
    Banner.countDocuments({ isActive: true }),
    Banner.countDocuments({ isActive: false }),
    Banner.findOne({}).sort({ updatedAt: -1 }).select("title updatedAt order isActive").lean(),
    Banner.aggregate([
      {
        $match: {
          isActive: true,
          buttonLink: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$buttonLink",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]),
  ]);

  const compactOrders = ordersByStatus.reduce<Record<string, number>>((acc, item: { _id: string; count: number }) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const todayOrders = todayOrderAgg?.[0]?.count || 0;
  const todayGMV = todayOrderAgg?.[0]?.gmv || 0;
  const yesterdayOrders = yesterdayOrderAgg?.[0]?.count || 0;
  const yesterdayGMV = yesterdayOrderAgg?.[0]?.gmv || 0;

  const paymentCounts = paymentStatusAgg.reduce<Record<string, number>>((acc, item: { _id: string; count: number }) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const paymentSuccessCount = paymentCounts.success || 0;
  const paymentFailedCount = paymentCounts.failed || 0;
  const paymentTotalTracked = Object.values(paymentCounts).reduce((sum, count) => sum + count, 0);

  const avgPickupMinutes = deliveryTimingAgg?.[0]?.avgPickupMinutes || 0;
  const avgDeliveryMinutes = deliveryTimingAgg?.[0]?.avgDeliveryMinutes || 0;

  const topDeliveryCancellationReasons = cancellationReasonAgg.map(
    (item: { _id?: string; count: number }) => `${item._id || "unknown"}:${item.count}`,
  );

  const topActiveBannerLinks = topBannerLinks.map(
    (item: { _id?: string; count: number }) => `${item._id || "/user/products"}:${item.count}`,
  );

  return {
    pendingRoleRequests,
    activePartners,
    highPriorityAssignments,
    todayOrders,
    todayGMV: toFixedNumber(todayGMV, 2),
    orderTrendVsYesterdayPct: toPercent(todayOrders, yesterdayOrders),
    gmvTrendVsYesterdayPct: toPercent(todayGMV, yesterdayGMV),
    paymentSuccessRate: paymentTotalTracked ? toFixedNumber((paymentSuccessCount / paymentTotalTracked) * 100, 1) : 0,
    paymentFailureRate: paymentTotalTracked ? toFixedNumber((paymentFailedCount / paymentTotalTracked) * 100, 1) : 0,
    failedPaymentsToday,
    returnBacklogOver48h,
    deliveryAvgPickupMinutes: toFixedNumber(avgPickupMinutes, 1),
    deliveryAvgCompletionMinutes: toFixedNumber(avgDeliveryMinutes, 1),
    topDeliveryCancellationReasons,
    totalBanners,
    activeBanners,
    inactiveBanners,
    latestBannerTitle: latestBanner?.title || "N/A",
    latestBannerOrder: latestBanner?.order ?? 0,
    latestBannerActive: latestBanner?.isActive ? 1 : 0,
    latestBannerUpdatedAt: latestBanner?.updatedAt ? new Date(latestBanner.updatedAt).toISOString() : "N/A",
    topActiveBannerLinks,
    ordersByStatus: JSON.stringify(compactOrders),
  };
}

export async function buildRoleAwareContext(params: {
  role: SnapcartRole;
  userId?: string;
  userName?: string;
}): Promise<RoleAwareContext> {
  const { role, userId, userName } = params;
  const global = await getGlobalStats();

  let roleStats: Record<string, string | number | boolean | string[]> = {};

  if (role === "user" && userId) {
    roleStats = await getUserStats(userId);
  }

  if (role === "deliveryBoy" && userId) {
    roleStats = await getDeliveryStats(userId);
  }

  if (role === "admin") {
    roleStats = await getAdminStats();
  }

  return {
    role,
    userName,
    timestampISO: new Date().toISOString(),
    global,
    roleStats,
    quickActions: getQuickActionsForRole(role),
  };
}
