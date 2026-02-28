// src/app/admin/returns/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { ReturnsManagement } from "@/components/admin/ReturnsManagement";
import { ReturnsAnalytics } from "@/components/admin/ReturnsAnalytics";
import { useSocket } from "@/contexts/SocketContext";

const ReturnsPage = () => {
  const socket = useSocket();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");

  useEffect(() => {
    if (!socket) return;

    // Listen for real-time return events
    socket.on("return:created", (data) => {
      console.log("New return created:", data);
      setRefreshTrigger((prev) => prev + 1);
    });

    socket.on("return:updated", (data) => {
      console.log("Return updated:", data);
      setRefreshTrigger((prev) => prev + 1);
    });

    socket.on("return:cancelled", (data) => {
      console.log("Return cancelled:", data);
      setRefreshTrigger((prev) => prev + 1);
    });

    socket.on("return:status-changed", (data) => {
      console.log("Return status changed:", data);
      setRefreshTrigger((prev) => prev + 1);
    });

    return () => {
      socket.off("return:created");
      socket.off("return:updated");
      socket.off("return:cancelled");
      socket.off("return:status-changed");
    };
  }, [socket]);

  const statuses = [
    { label: "All", value: null },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "In Transit", value: "in-transit" },
    { label: "Received", value: "received" },
    { label: "Completed", value: "completed" },
    { label: "Rejected", value: "rejected" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Returns Management</h1>
        <p className="text-gray-600 mt-2">
          Manage customer returns and refunds in real-time
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "list"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Returns List
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "analytics"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Analytics & Insights
        </button>
      </div>

      {activeTab === "list" ? (
        <>
          {/* Status Filter Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Filter by Status:</p>
            <div className="flex gap-2 flex-wrap">
              {statuses.map((s) => (
                <button
                  key={s.value || "all"}
                  onClick={() => setSelectedStatus(s.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedStatus === s.value
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pass refresh trigger and selected status as key to force re-fetch */}
          <ReturnsManagement key={`${refreshTrigger}-${selectedStatus}`} status={selectedStatus || undefined} />
        </>
      ) : (
        <ReturnsAnalytics key={refreshTrigger} />
      )}
    </div>
  );
};

export default ReturnsPage;
