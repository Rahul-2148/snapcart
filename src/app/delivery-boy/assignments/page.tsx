"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface Assignment {
  _id: string;
  orderNumber: string;
  status: string;
  pickupLocation: { address: string };
  deliveryLocation: { address: string };
  estimatedDistance: number;
  estimatedTime: number;
  createdAt: string;
}

export default function DeliveryBoyAssignmentsPage() {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [activeAssignments, setActiveAssignments] = useState<Assignment[]>([]);
  const [historyAssignments, setHistoryAssignments] = useState<Assignment[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      const [activeRes, historyRes] = await Promise.all([
        fetch(
          "/api/delivery-boy/assigned-orders?status=assigned,picked_up,on_the_way",
        ),
        fetch("/api/delivery-boy/assigned-orders?status=delivered,cancelled"),
      ]);

      const activeData = await activeRes.json();
      const historyData = await historyRes.json();

      if (activeData.success) {
        setActiveAssignments(activeData.assignments || []);
      }
      if (historyData.success) {
        setHistoryAssignments(historyData.assignments || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const renderCard = (assignment: Assignment) => (
    <Link
      key={assignment._id}
      href={`/delivery-boy/assignments/${assignment._id}`}
      className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">Order #{assignment.orderNumber}</h3>
          <p className="text-sm text-gray-600 capitalize">
            Status: {assignment.status.replace(/_/g, " ")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">
            {new Date(assignment.createdAt).toLocaleString("en-IN")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500">Pickup</p>
          <p className="text-sm font-semibold">
            {assignment.pickupLocation?.address?.substring(0, 60)}...
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Delivery</p>
          <p className="text-sm font-semibold">
            {assignment.deliveryLocation?.address?.substring(0, 60)}...
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
          {assignment.estimatedTime} min
        </span>
        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
          {assignment.estimatedDistance} km
        </span>
      </div>
    </Link>
  );

  if (loading) return <div className="p-6">Loading deliveries...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Deliveries</h1>
          <p className="text-gray-600">All active and past deliveries</p>
        </div>
        <button
          onClick={fetchAssignments}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Refresh
        </button>
      </div>

      <div className="flex gap-6 border-b mb-6">
        <button
          className={`pb-3 font-semibold ${
            activeTab === "active"
              ? "border-b-2 border-green-600 text-green-700"
              : "text-gray-600"
          }`}
          onClick={() => setActiveTab("active")}
        >
          Active Deliveries ({activeAssignments.length})
        </button>
        <button
          className={`pb-3 font-semibold ${
            activeTab === "history"
              ? "border-b-2 border-green-600 text-green-700"
              : "text-gray-600"
          }`}
          onClick={() => setActiveTab("history")}
        >
          Past Deliveries ({historyAssignments.length})
        </button>
      </div>

      {activeTab === "active" && (
        <div className="space-y-4">
          {activeAssignments.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-center">
              <p className="text-gray-600">No active deliveries right now.</p>
            </div>
          ) : (
            activeAssignments.map(renderCard)
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {historyAssignments.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-center">
              <p className="text-gray-600">No past deliveries found.</p>
            </div>
          ) : (
            historyAssignments.map(renderCard)
          )}
        </div>
      )}
    </div>
  );
}
