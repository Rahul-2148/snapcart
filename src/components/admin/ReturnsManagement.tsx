// src/components/admin/ReturnsManagement.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Clock, CheckCircle2, Truck, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReturnRequest {
  _id: string;
  orderItem: any;
  user: any;
  grocery: any;
  order: any;
  requestType: "return" | "replacement";
  status: string;
  reason: string;
  description?: string;
  images?: Array<{ url: string; publicId: string }>;
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
    variantId?: string;
    quantity?: number;
    shippedAt?: Date;
    deliveredAt?: Date;
  };
  notes?: string;
}

interface ReturnsManagementProps {
  status?: string;
}

export const ReturnsManagement: React.FC<ReturnsManagementProps> = ({
  status,
}) => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [availablePartners, setAvailablePartners] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState("");

  // Reset page when status filter changes
  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    fetchReturns();
  }, [status, page]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (status) params.append("status", status);

      console.log("Fetching returns with params:", params.toString());
      const response = await fetch(`/api/admin/returns?${params}`);
      const data = await response.json();
      console.log("Returns data received:", data);
      setReturns(data.returnRequests || []);
    } catch (error) {
      console.error("Error fetching returns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (returnId: string, newStatus: string) => {
    // If rejecting, show modal for rejection reason
    if (newStatus === "rejected") {
      setShowRejectModal(true);
      return;
    }

    try {
      setUpdatingStatus(newStatus);
      const response = await fetch(`/api/admin/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        let message = `Return status updated to ${newStatus}`;
        if (newStatus === "completed") {
          message = "✅ Return completed! Refund email sent to customer";
        }
        toast.success(message);
        fetchReturns();
        setSelectedReturn(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error updating status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleRejectWithReason = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    if (!selectedReturn) return;

    try {
      setUpdatingStatus("rejected");
      const response = await fetch(`/api/admin/returns/${selectedReturn._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          rejectionReason: rejectionReason,
        }),
      });

      if (response.ok) {
        toast.success("Return rejected successfully");
        setShowRejectModal(false);
        setRejectionReason("");
        fetchReturns();
        setSelectedReturn(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to reject return");
      }
    } catch (error) {
      console.error("Error rejecting return:", error);
      toast.error("Error rejecting return");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const fetchAvailablePartners = async () => {
    try {
      const response = await fetch("/api/admin/delivery-partners?status=available");
      const data = await response.json();
      setAvailablePartners(data.deliveryPartners || []);
    } catch (error) {
      console.error("Error fetching partners:", error);
    }
  };

  const handleAssignPickup = async () => {
    if (!selectedPartner) {
      toast.error("Please select a delivery partner");
      return;
    }

    if (!selectedReturn) return;

    try {
      const response = await fetch(
        `/api/admin/returns/${selectedReturn._id}/assign-pickup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryPartnerId: selectedPartner,
            pickupScheduledAt: new Date(),
          }),
        },
      );

      if (response.ok) {
        toast.success("Pickup assigned successfully!");
        setShowPickupModal(false);
        setSelectedPartner("");
        fetchReturns();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to assign pickup");
      }
    } catch (error) {
      console.error("Error assigning pickup:", error);
      toast.error("Error assigning pickup");
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

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    });
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold">Manage Returns</h2>

      {/* Returns Table */}
      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left">Customer</th>
              <th className="border p-2 text-left">Product</th>
              <th className="border p-2 text-left">Type</th>
              <th className="border p-2 text-left">Reason</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Requested</th>
              <th className="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.length === 0 ? (
              <tr>
                <td colSpan={7} className="border p-4 text-center text-gray-500">
                  No returns found
                </td>
              </tr>
            ) : (
              returns.map((ret) => (
                <tr key={ret._id} className="hover:bg-gray-50">
                  <td className="border p-2">{ret.user?.name}</td>
                  <td className="border p-2">{ret.grocery?.name}</td>
                  <td className="border p-2 capitalize font-medium">{ret.requestType}</td>
                <td className="border p-2 capitalize text-xs">{ret.reason}</td>
                <td className="border p-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(ret.status)}`}>
                    {ret.status}
                  </span>
                </td>
                <td className="border p-2 text-xs">{formatDate(ret.requestedAt)}</td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => setSelectedReturn(ret)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View
                  </button>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold">Return Details</h3>
                <p className="text-sm text-gray-600">Order #{selectedReturn.order?.orderNumber}</p>
              </div>
              <button
                onClick={() => setSelectedReturn(null)}
                className="text-2xl hover:bg-gray-100 w-8 h-8 flex items-center justify-center rounded"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Customer</h4>
                  <p className="font-medium">{selectedReturn.user?.name}</p>
                  <p className="text-sm text-gray-600">{selectedReturn.user?.email}</p>
                  <p className="text-sm text-gray-600">{selectedReturn.user?.mobileNumber}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Product</h4>
                  <p className="font-medium">{selectedReturn.grocery?.name}</p>
                  <p className="text-sm text-gray-600 capitalize">Type: {selectedReturn.requestType}</p>
                  <p className="text-sm text-gray-600 capitalize">Reason: {selectedReturn.reason}</p>
                  {selectedReturn.description && (
                    <p className="text-sm text-gray-600 mt-2">Details: {selectedReturn.description}</p>
                  )}
                </div>
                
                {/* Images Section */}
                {selectedReturn.images && selectedReturn.images.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Uploaded Images</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedReturn.images.map((img, idx) => (
                        <a
                          key={idx}
                          href={img.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={img.url}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-24 object-cover rounded border border-gray-300 hover:border-blue-500 transition-colors cursor-pointer"
                          />
                        </a>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Click to view full size</p>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Status & Timeline</h4>
                  <div className="space-y-3">
                    {[
                      { label: "Requested", date: selectedReturn.requestedAt, icon: Clock },
                      { label: "Approved", date: selectedReturn.approvedAt, icon: CheckCircle2 },
                      { label: "Picked Up", date: selectedReturn.pickedUpAt, icon: Truck },
                      { label: "Received", date: selectedReturn.receivedAt, icon: CheckCircle2 },
                      { label: "Completed", date: selectedReturn.completedAt, icon: CheckCircle2 },
                    ].map((step) => {
                      const Icon = step.icon;
                      return (
                        <div key={step.label} className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${step.date ? "text-green-600" : "text-gray-300"}`} />
                          <span className={`text-sm ${step.date ? "font-medium" : "text-gray-500"}`}>
                            {step.label}
                          </span>
                          {step.date && (
                            <span className="text-xs text-gray-600 ml-auto">
                              {formatDate(step.date)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedReturn.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-2">Rejection Reason</h4>
                    <p className="text-sm text-red-800">{selectedReturn.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Refund/Replacement Info */}
            {selectedReturn.refund && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-blue-900 mb-2">Refund Details</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700">Amount</p>
                    <p className="font-medium">₹{selectedReturn.refund.amount}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Method</p>
                    <p className="font-medium capitalize">{selectedReturn.refund.method}</p>
                  </div>
                  {selectedReturn.refund.completedAt && (
                    <div>
                      <p className="text-blue-700">Processed</p>
                      <p className="font-medium">{formatDate(selectedReturn.refund.completedAt)}</p>
                    </div>
                  )}
                </div>
                {selectedReturn.refund.transactionId && (
                  <p className="text-xs text-gray-600 mt-2 break-all">Txn ID: {selectedReturn.refund.transactionId}</p>
                )}
              </div>
            )}

            {selectedReturn.replacement && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-green-900 mb-2">Replacement Details</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-green-700">Quantity</p>
                    <p className="font-medium">{selectedReturn.replacement.quantity}</p>
                  </div>
                  {selectedReturn.replacement.shippedAt && (
                    <div>
                      <p className="text-green-700">Shipped</p>
                      <p className="font-medium">{formatDate(selectedReturn.replacement.shippedAt as any)}</p>
                    </div>
                  )}
                  {selectedReturn.replacement.deliveredAt && (
                    <div>
                      <p className="text-green-700">Delivered</p>
                      <p className="font-medium">{formatDate(selectedReturn.replacement.deliveredAt as any)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Update */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Update Status</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  "pending",
                  "approved",
                  "rejected",
                  "in-transit",
                  "received",
                  "completed",
                  "cancelled",
                ].map((s) => {
                  const isUpdating = updatingStatus === s;
                  const isCurrentStatus = selectedReturn.status === s;
                  
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        handleStatusChange(selectedReturn._id, s);
                      }}
                      disabled={isCurrentStatus || updatingStatus !== null}
                      className={`px-3 py-2 rounded text-sm font-medium transition flex items-center gap-2 ${
                        isCurrentStatus
                          ? "bg-green-600 text-white cursor-default"
                          : isUpdating
                          ? "bg-gray-300 text-gray-600 cursor-wait"
                          : updatingStatus !== null
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-white border border-gray-300 hover:bg-gray-50 cursor-pointer"
                      }`}
                    >
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  );
                })}
              </div>
              
              {/* Assign Pickup Button */}
              {(selectedReturn.status === "approved" || selectedReturn.status === "pending") && !selectedReturn.deliveryPartner && (
                <button
                  onClick={() => {
                    fetchAvailablePartners();
                    setShowPickupModal(true);
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 font-medium"
                >
                  <Truck className="w-4 h-4 inline mr-2" />
                  Assign Pickup Partner
                </button>
              )}
              
              {selectedReturn.deliveryPartner && (
                <div className="bg-green-50 border border-green-200 p-3 rounded mt-3">
                  <p className="text-sm font-semibold text-green-700">
                    ✓ Pickup assigned to delivery partner
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Rejection Reason Modal */}
      {showRejectModal && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Reject Return Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this return request:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Product is not defective, return window expired, etc."
              className="w-full border rounded p-3 mb-4 min-h-[120px]"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleRejectWithReason}
                disabled={!rejectionReason.trim() || updatingStatus !== null}
                className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {updatingStatus ? "Rejecting..." : "Reject Return"}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                className="flex-1 border py-2 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Pickup Assignment Modal */}
      {showPickupModal && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Assign Pickup Partner</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select a delivery partner to pick up the return:
            </p>
            <select
              value={selectedPartner}
              onChange={(e) => setSelectedPartner(e.target.value)}
              className="w-full border rounded p-3 mb-4"
            >
              <option value="">-- Select Partner --</option>
              {availablePartners.map((partner) => (
                <option key={partner._id} value={partner._id}>
                  {partner.name} - {partner.mobileNumber}
                </option>
              ))}
            </select>
            {availablePartners.length === 0 && (
              <p className="text-sm text-amber-700 mb-4">
                ⚠️ No available delivery partners found. Please check partner availability.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleAssignPickup}
                disabled={!selectedPartner}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                Assign Pickup
              </button>
              <button
                onClick={() => {
                  setShowPickupModal(false);
                  setSelectedPartner("");
                }}
                className="flex-1 border py-2 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
