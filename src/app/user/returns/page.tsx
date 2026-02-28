"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, CheckCircle2, AlertCircle, RotateCw } from "lucide-react";
import { useSnackbar } from "notistack";
import { useSocket } from "@/contexts/SocketContext";

interface ReturnRequest {
  _id: string;
  order: {
    _id: string;
    orderNumber: string;
    finalTotal: number;
    currency: string;
  };
  grocery?: {
    name: string;
  };
  orderItem?: {
    groceryName: string;
  };
  requestType: "return" | "replacement";
  status: string;
  reason: string;
  description?: string;
  requestedAt: string;
  approvedAt?: string;
  pickedUpAt?: string;
  receivedAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  deliveryPartner?: any;
  refund?: {
    amount: number;
    method: string;
    transactionId?: string;
    completedAt?: string;
  };
  replacement?: {
    quantity?: number;
    shippedAt?: string;
    deliveredAt?: string;
  };
}

export default function UserReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const socket = useSocket();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!socket) return;

    const handleReturnChange = () => {
      setRefreshTrigger((prev) => prev + 1);
    };

    socket.on("return:status-changed", handleReturnChange);
    socket.on("return:updated", handleReturnChange);

    return () => {
      socket.off("return:status-changed", handleReturnChange);
      socket.off("return:updated", handleReturnChange);
    };
  }, [socket]);

  useEffect(() => {
    fetchReturns();
  }, [refreshTrigger, selectedStatus]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus) params.append("status", selectedStatus);

      const res = await fetch(`/api/returns/my-returns?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch returns");
      const data = await res.json();
      setReturns(data.returns || []);
    } catch (err: any) {
      enqueueSnackbar(err.message || "Failed to fetch returns", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "in-transit":
        return "bg-purple-100 text-purple-800";
      case "received":
        return "bg-cyan-100 text-cyan-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "rejected":
      case "cancelled":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <RotateCw className="w-4 h-4" />;
    }
  };

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/user/orders"
            className="inline-flex items-center text-green-600 hover:text-green-700 mb-4"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Returns & Refunds</h1>
          <p className="text-gray-600 mt-2">Track all your return requests and refund status</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">Filter by Status:</p>
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s.value || "all"}
                onClick={() => setSelectedStatus(s.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedStatus === s.value
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Returns List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : returns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <RotateCw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No returns found</h3>
            <p className="text-gray-600">
              {selectedStatus
                ? `No returns with status "${selectedStatus}"`
                : "You haven't created any returns yet"}
            </p>
            <Link
              href="/user/orders"
              className="inline-flex items-center px-6 py-3 mt-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              View Orders
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {returns.map((ret) => (
              <Link
                key={ret._id}
                href={`/user/orders/${ret.order._id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {ret.orderItem?.groceryName || ret.grocery?.name || "Product"}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(ret.status)}`}>
                        {getStatusIcon(ret.status)}
                        {ret.status.replace("-", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Order #{ret.order.orderNumber}</p>
                    <p className="text-sm text-gray-600 mb-3">
                      Type: <span className="font-medium capitalize">{ret.requestType}</span> • 
                      Reason: <span className="font-medium capitalize">{ret.reason}</span>
                    </p>

                    {/* Dates */}
                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                      <p>Requested: {new Date(ret.requestedAt).toLocaleDateString("en-IN")}</p>
                      {ret.approvedAt && <p>Approved: {new Date(ret.approvedAt).toLocaleDateString("en-IN")}</p>}
                      {ret.completedAt && <p>Completed: {new Date(ret.completedAt).toLocaleDateString("en-IN")}</p>}
                    </div>

                    {/* Refund Details */}
                    {ret.refund && (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <p className="text-sm font-semibold text-green-700 mb-1">✓ Refund Processed</p>
                        <div className="text-xs text-green-700 space-y-1">
                          <p>Amount: <span className="font-bold">{ret.order.currency} {ret.refund.amount.toFixed(2)}</span></p>
                          <p>Method: <span className="font-medium">{ret.refund.method}</span></p>
                          {ret.refund.transactionId && ret.refund.transactionId !== "REFUND_PROCESSING" && (
                            <p>Transaction ID: <span className="font-mono">{ret.refund.transactionId}</span></p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {ret.status === "rejected" && ret.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm font-semibold text-red-700 mb-1">Return Rejected</p>
                        <p className="text-xs text-red-700">{ret.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {ret.order.currency} {ret.order.finalTotal.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Amount</p>
                    
                    {/* Track Pickup Button */}
                    {ret.deliveryPartner && ret.status !== "received" && ret.status !== "completed" && (
                      <Link
                        href={`/return/tracking?returnId=${ret._id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 inline-block text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
                      >
                        Track Pickup
                      </Link>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
