"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  Mail,
  Phone,
  Calendar,
  Star,
  Package,
  IndianRupee,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PartnerDetails {
  partner: {
    _id: string;
    name: string;
    email: string;
    mobileNumber: string;
    isBlocked: boolean;
    joinedAt: string;
    roles: string[];
    currentRole: string;
    kyc?: {
      status: "not_submitted" | "pending" | "approved" | "rejected";
      documents?: Array<{
        type: "aadhaar_front" | "aadhaar_back" | "pan" | "license" | "selfie";
        url: string;
        publicId: string;
        uploadedAt: string;
      }>;
      submittedAt?: string;
      reviewedAt?: string;
      rejectionReason?: string;
      aadhaarNumber?: string;
      panNumber?: string;
      licenseNumber?: string;
    };
  };
  stats: {
    totalDeliveries: number;
    cancelledDeliveries: number;
    totalEarnings: number;
    averageRating: number;
    onTimePercentage: number;
    ratingsCount: number;
  };
  chartData: Array<{ date: string; count: number }>;
  recentAssignments: Array<{
    _id: string;
    orderId: string;
    orderNumber: string;
    status: string;
    earnings: number;
    assignedAt: string;
    completedAt?: string;
    deliveryAddress: any;
  }>;
}

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.id as string;

  const [details, setDetails] = useState<PartnerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [kycActionLoading, setKycActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchPartnerDetails();
  }, [partnerId]);

  const fetchPartnerDetails = async () => {
    try {
      const res = await fetch(`/api/admin/delivery-partners/${partnerId}`);
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const data = await res.json();

      if (data.success) {
        setDetails(data);
      } else {
        toast.error(data.message || "Failed to fetch partner details");
      }
    } catch (error: any) {
      console.error("Error loading partner details:", error);
      toast.error(error?.message || "Failed to load partner details");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!details) return;

    try {
      const res = await fetch(
        `/api/admin/delivery-partners/${partnerId}/block`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocked: !details.partner.isBlocked }),
        },
      );

      if (res.ok) {
        toast.success(
          details.partner.isBlocked
            ? "Partner unblocked successfully"
            : "Partner blocked successfully",
        );
        fetchPartnerDetails();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update partner status");
      }
    } catch (error) {
      toast.error("Error updating partner status");
    }
  };

  const handleKycAction = async (action: "approve" | "reject") => {
    if (!details) return;
    if (action === "reject" && !rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    try {
      setKycActionLoading(true);
      const res = await fetch(
        `/api/admin/delivery-partners/${partnerId}/kyc`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            rejectionReason: rejectionReason.trim() || undefined,
          }),
        },
      );

      const data = await res.json();
      if (res.ok) {
        toast.success("KYC updated successfully");
        setRejectionReason("");
        fetchPartnerDetails();
      } else {
        toast.error(data.message || "Failed to update KYC");
      }
    } catch (error) {
      toast.error("Failed to update KYC");
    } finally {
      setKycActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">Loading partner details...</div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12 text-red-500">
          Failed to load partner details
        </div>
      </div>
    );
  }

  const { partner, stats, chartData, recentAssignments } = details;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/delivery-partners")}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">{partner.name}</h1>
            <p className="text-gray-600">Delivery Partner Profile</p>
          </div>
        </div>
        <button
          onClick={handleBlockToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            partner.isBlocked
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {partner.isBlocked ? (
            <>
              <CheckCircle className="h-5 w-5" />
              Unblock Partner
            </>
          ) : (
            <>
              <Ban className="h-5 w-5" />
              Block Partner
            </>
          )}
        </button>
      </div>

      {/* Profile Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <span>{partner.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-500" />
              <span>{partner.mobileNumber}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <span>
                Joined: {new Date(partner.joinedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Status:{" "}
              <span
                className={`font-semibold ${
                  partner.isBlocked ? "text-red-600" : "text-green-600"
                }`}
              >
                {partner.isBlocked ? "Blocked" : "Active"}
              </span>
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Deliveries</p>
              <p className="text-2xl font-bold">{stats.totalDeliveries}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold">
                {stats.averageRating.toFixed(1)}⭐
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">On-Time %</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.onTimePercentage.toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold">
                ₹{stats.totalEarnings.toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        {/* KYC Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">KYC Verification</h2>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                partner.kyc?.status === "approved"
                  ? "bg-green-100 text-green-700"
                  : partner.kyc?.status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : partner.kyc?.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
              }`}
            >
              {partner.kyc?.status || "not_submitted"}
            </span>
            {partner.kyc?.submittedAt && (
              <span className="text-sm text-gray-500">
                Submitted: {new Date(partner.kyc.submittedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {partner.kyc?.rejectionReason && (
            <p className="text-sm text-red-600 mt-2">
              Reason: {partner.kyc.rejectionReason}
            </p>
          )}
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            {partner.kyc?.aadhaarNumber && <p>Aadhaar: {partner.kyc.aadhaarNumber}</p>}
            {partner.kyc?.panNumber && <p>PAN: {partner.kyc.panNumber}</p>}
            {partner.kyc?.licenseNumber && <p>License: {partner.kyc.licenseNumber}</p>}
          </div>
          {partner.kyc?.documents && partner.kyc.documents.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {partner.kyc.documents.map((doc) => (
                <a
                  key={doc.publicId}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="border rounded-lg p-2 text-sm text-blue-600 hover:underline"
                >
                  {doc.type.replace("_", " ")}
                </a>
              ))}
            </div>
          )}
          {partner.kyc?.status === "pending" && (
            <div className="mt-4 space-y-3">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Rejection reason (required to reject)"
                className="w-full border rounded-lg p-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleKycAction("approve")}
                  disabled={kycActionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleKycAction("reject")}
                  disabled={kycActionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-700">Completed</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.totalDeliveries}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Ban className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-red-700">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.cancelledDeliveries}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Star className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-sm text-yellow-700">Reviews</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.ratingsCount}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <IndianRupee className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-green-700">Earnings</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{stats.totalEarnings.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Trend Chart */}
      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Delivery Trend (Last 7 Days)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Deliveries" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Deliveries */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Recent Deliveries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentAssignments.map((assignment) => (
                <tr key={assignment._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium">
                      {assignment.orderNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        assignment.status === "delivered"
                          ? "bg-green-100 text-green-800"
                          : assignment.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {assignment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ₹{assignment.earnings.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(assignment.assignedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {assignment.completedAt
                      ? new Date(assignment.completedAt).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {assignment.deliveryAddress?.addressLine1 || "N/A"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {assignment.deliveryAddress?.city},{" "}
                      {assignment.deliveryAddress?.pincode}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentAssignments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No recent deliveries found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
