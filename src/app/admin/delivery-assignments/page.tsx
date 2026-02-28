"use client";

import React, { useEffect, useState } from "react";

interface Assignment {
  _id: string;
  order: { orderNumber: string; orderStatus: string };
  assignedTo?: { name: string; email: string };
  status: string;
  estimatedDistance: number;
  estimatedTime: number;
  priority: string;
  createdAt: string;
  expiresAt?: string;
}

export default function DeliveryAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("broadcasted");
  const [rebroadcasting, setRebroadcasting] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, [statusFilter]);

  const fetchAssignments = async () => {
    try {
      const res = await fetch(
        `/api/admin/delivery-assignments?status=${statusFilter}`,
      );
      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments);
      }
    } catch (error) {
      console.error("Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleRebroadcast = async (assignmentId: string) => {
    setRebroadcasting(assignmentId);
    try {
      const res = await fetch("/api/admin/delivery-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          action: "rebroadcast",
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAssignments();
        alert("Assignment re-broadcasted successfully");
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("Failed to re-broadcast");
    } finally {
      setRebroadcasting(null);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  const statuses = [
    "broadcasted",
    "assigned",
    "picked_up",
    "on_the_way",
    "delivered",
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Delivery Assignments</h1>
        <p className="text-gray-600">Monitor and manage delivery assignments</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setLoading(true);
            }}
            className={`px-4 py-2 rounded capitalize ${
              statusFilter === s
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-4 text-left">Order</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Partner</th>
              <th className="p-4 text-center">Distance/ETA</th>
              <th className="p-4 text-left">Created</th>
              <th className="p-4 text-left">Expires</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {assignments.map((assignment) => (
              <tr key={assignment._id} className="hover:bg-gray-50">
                <td className="p-4 font-semibold">
                  #{assignment.order.orderNumber}
                </td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      assignment.status === "broadcasted"
                        ? "bg-yellow-100 text-yellow-800"
                        : assignment.status === "assigned"
                          ? "bg-blue-100 text-blue-800"
                          : assignment.status === "picked_up"
                            ? "bg-purple-100 text-purple-800"
                            : assignment.status === "on_the_way"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-green-100 text-green-800"
                    }`}
                  >
                    {assignment.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="p-4">
                  {assignment.assignedTo ? (
                    <div className="text-sm">
                      <p className="font-semibold">
                        {assignment.assignedTo.name}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {assignment.assignedTo.email}
                      </p>
                    </div>
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  )}
                </td>
                <td className="p-4 text-center text-sm">
                  {assignment.estimatedDistance} km / {assignment.estimatedTime}{" "}
                  min
                </td>
                <td className="p-4 text-sm">
                  {new Date(assignment.createdAt).toLocaleString("en-IN")}
                </td>
                <td className="p-4 text-sm">
                  {assignment.expiresAt
                    ? new Date(assignment.expiresAt).toLocaleTimeString("en-IN")
                    : "N/A"}
                </td>
                <td className="p-4 text-center">
                  {assignment.status === "broadcasted" && (
                    <button
                      onClick={() => handleRebroadcast(assignment._id)}
                      disabled={rebroadcasting === assignment._id}
                      className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:opacity-50"
                    >
                      {rebroadcasting === assignment._id
                        ? "Broadcasting..."
                        : "Re-broadcast"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {assignments.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No assignments found
          </div>
        )}
      </div>
    </div>
  );
}
