// src/components/admin/ReturnsAnalytics.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Package,
  TrendingUp,
  Clock,
  Truck,
  CheckCircle,
  IndianRupee,
  AlertTriangle,
} from "lucide-react";

interface AnalyticsData {
  summary: {
    totalReturns: number;
    recentReturns: number;
    lastWeekReturns: number;
    pendingReturns: number;
    awaitingPickup: number;
    completedReturns: number;
    returnRate: string;
  };
  refundStats: {
    totalRefunded: number;
    avgRefund: number;
    count: number;
  };
  returnsByStatus: Record<string, number>;
  returnsByReason: Array<{ reason: string; count: number }>;
  returnsByType: Record<string, number>;
  returnsTrend: Array<{ date: string; count: number }>;
}

export const ReturnsAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/admin/returns/analytics");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: "Total Returns",
      value: data.summary.totalReturns,
      icon: Package,
      color: "bg-blue-500",
      change: `${data.summary.recentReturns} last 30 days`,
    },
    {
      label: "Pending Review",
      value: data.summary.pendingReturns,
      icon: Clock,
      color: "bg-yellow-500",
      change: "Require action",
    },
    {
      label: "Awaiting Pickup",
      value: data.summary.awaitingPickup,
      icon: Truck,
      color: "bg-orange-500",
      change: "Need assignment",
    },
    {
      label: "Completed (30d)",
      value: data.summary.completedReturns,
      icon: CheckCircle,
      color: "bg-green-500",
      change: `${data.summary.lastWeekReturns} last 7 days`,
    },
    {
      label: "Total Refunded",
      value: `₹${data.refundStats.totalRefunded.toFixed(0)}`,
      icon: IndianRupee,
      color: "bg-purple-500",
      change: `${data.refundStats.count} refunds`,
    },
    {
      label: "Return Rate",
      value: `${data.summary.returnRate}%`,
      icon: TrendingUp,
      color: "bg-red-500",
      change: "Last 30 days",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Returns by Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Returns by Status</h3>
          <div className="space-y-3">
            {Object.entries(data.returnsByStatus).map(([status, count]) => {
              const percentage = (count / data.summary.totalReturns) * 100;
              return (
                <div key={status} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize font-medium">
                      {status.replace("-", " ")}
                    </span>
                    <span className="text-gray-600">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Returns by Type */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Return vs Replacement</h3>
          <div className="space-y-4">
            {Object.entries(data.returnsByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      type === "return"
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    {type === "return" ? (
                      <Package className="w-6 h-6" />
                    ) : (
                      <CheckCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold capitalize">{type}</p>
                    <p className="text-sm text-gray-600">{count} requests</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {((count / data.summary.totalReturns) * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Return Reasons */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Top Return Reasons
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.returnsByReason.slice(0, 6).map((item) => (
            <div
              key={item.reason}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <p className="text-sm text-gray-600 capitalize mb-1">
                {item.reason.replace("-", " ")}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                <p className="text-xs text-gray-500">
                  ({((item.count / data.summary.totalReturns) * 100).toFixed(1)}
                  %)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7-Day Trend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">7-Day Returns Trend</h3>
        <div className="flex items-end gap-2 h-48">
          {data.returnsTrend.map((day) => {
            const maxCount = Math.max(...data.returnsTrend.map((d) => d.count));
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div
                  className="w-full bg-blue-600 rounded-t hover:bg-blue-700 transition-colors relative group"
                  style={{ height: `${height}%` }}
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100">
                    {day.count}
                  </span>
                </div>
                <span className="text-xs text-gray-600">
                  {new Date(day.date).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
