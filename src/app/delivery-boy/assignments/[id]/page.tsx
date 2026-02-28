"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { OTPVerification } from "@/components/OTPVerification";
import { PhotoUpload } from "@/components/PhotoUpload";

interface Assignment {
  _id: string;
  order?: string;
  orderNumber: string;
  status: string;
  pickupLocation: any;
  deliveryLocation: any;
  estimatedDistance: number;
  estimatedTime: number;
  rewardAmount?: number;
  timeline?: { status: string; timestamp: string; note?: string }[];
}

export default function AssignmentDetails() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [callingCustomer, setCallingCustomer] = useState(false);

  const maskPhone = (mobile?: string) => {
    if (!mobile) return "";
    const digits = mobile.replace(/\D/g, "");
    const last4 = digits.slice(-4);
    return last4 ? `****${last4}` : "****";
  };

  const fetchAssignment = async () => {
    try {
      const res = await fetch(`/api/delivery-boy/assignments/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setAssignment(data.assignment);
      } else {
        setError(data.message || "Unable to load assignment");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchAssignment();
  }, []);

  const callAction = async (path: string, payload?: any) => {
    setLoading(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Action failed");
      await fetchAssignment();
      return data;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () =>
    callAction(`/api/delivery-boy/assignments/${params.id}/accept`);
  const handleReject = () =>
    callAction(`/api/delivery-boy/assignments/${params.id}/reject`);
  const handleCancel = () =>
    callAction(`/api/delivery-boy/assignments/${params.id}/cancel`, {
      reason: "Cancelled by partner",
    });
  const handlePickedUp = () =>
    callAction(`/api/delivery-boy/assignments/${params.id}/update-status`, {
      status: "picked_up",
    });
  const handleDelivered = async () => {
    setShowOtpVerification(true);
  };

  const handleCallCustomer = async () => {
    if (!assignment?.order) return;
    setCallingCustomer(true);
    try {
      const res = await fetch("/api/contact/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: assignment.order, role: "partner" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to place call");
      alert("Call initiated. Please keep your phone available.");
    } catch (err: any) {
      setError(err.message || "Unable to place call");
    } finally {
      setCallingCustomer(false);
    }
  };

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!assignment) {
    return <div className="p-6">Loading assignment...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">Order</p>
            <h1 className="text-2xl font-bold">#{assignment.orderNumber}</h1>
            <p className="text-sm text-gray-600">
              Status: {assignment.status.replace(/_/g, " ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Payout</p>
            <p className="text-2xl font-semibold text-green-600">
              ₹{assignment.rewardAmount || 0}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-xs text-gray-500">Pickup</p>
            <p className="font-semibold">
              {assignment.pickupLocation?.address}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Delivery</p>
            <p className="font-semibold">
              {assignment.deliveryLocation?.address}
            </p>
          </div>
        </div>
        {assignment.deliveryLocation?.mobile && (
          <div className="mt-4">
            <p className="text-xs text-gray-500">Customer Contact</p>
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={handleCallCustomer}
                disabled={callingCustomer}
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-60"
              >
                {callingCustomer ? "Calling..." : "Call Customer"}
              </button>
              <span className="text-sm text-gray-600">
                {maskPhone(assignment.deliveryLocation.mobile)}
              </span>
            </div>
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
            {assignment.estimatedDistance} km
          </span>
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
            {assignment.estimatedTime} min ETA
          </span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-3">
        <h2 className="font-semibold text-lg">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {assignment.status === "broadcasted" && (
            <>
              <button
                onClick={handleAccept}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}

          {assignment.status === "assigned" && (
            <>
              <button
                onClick={handlePickedUp}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Mark Picked Up
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}

          {assignment.status === "picked_up" && (
            <button
              onClick={handleDelivered}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Complete Delivery
            </button>
          )}
        </div>
      </div>

      {/* Photo Upload */}
      {(assignment.status === "picked_up" ||
        assignment.status === "on_the_way") && (
        <PhotoUpload assignmentId={params.id} />
      )}

      {/* OTP Verification */}
      {showOtpVerification && (
        <OTPVerification
          assignmentId={params.id}
          orderNumber={assignment.orderNumber}
          onVerified={() => {
            setShowOtpVerification(false);
            router.push("/delivery-boy");
          }}
        />
      )}

      {assignment.timeline?.length ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-3">Timeline</h2>
          <div className="space-y-2">
            {assignment.timeline.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between text-sm text-gray-700"
              >
                <span className="font-semibold capitalize">
                  {item.status.replace(/_/g, " ")}
                </span>
                <span className="text-gray-500">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
