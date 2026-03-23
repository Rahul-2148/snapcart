"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useSocket } from "@/contexts/SocketContext";
import { DeliveryRating } from "@/components/DeliveryRating";

// Dynamic import for TrackingMap to avoid SSR issues
const TrackingMap = dynamic(() => import("@/components/TrackingMap"), {
  ssr: false,
});

interface TrackingData {
  orderNumber: string;
  status: string;
  userLocation?: { lat: number; lng: number };
  timeline: any;
  assignment?: any;
  deliveryPartnerLocation?: { lat: number; lng: number; updatedAt: string };
  deliveryPartnerContact?: { name?: string; mobile?: string } | null;
}

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const socket = useSocket();

  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callingPartner, setCallingPartner] = useState(false);
  const [lastUpdateAt, setLastUpdateAt] = useState<string | null>(null);

  const maskPhone = (mobile?: string) => {
    if (!mobile) return "";
    const digits = mobile.replace(/\D/g, "");
    const last4 = digits.slice(-4);
    return last4 ? `****${last4}` : "****";
  };

  const handleCallPartner = async () => {
    if (!orderId) return;
    setCallingPartner(true);
    try {
      const res = await fetch("/api/contact/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, role: "customer" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to place call");
      alert("Call initiated. Please keep your phone available.");
    } catch (err: any) {
      alert(err.message || "Unable to place call");
    } finally {
      setCallingPartner(false);
    }
  };

  useEffect(() => {
    if (!orderId) return;

    const fetchTracking = async () => {
      try {
        const res = await fetch(`/api/order/tracking?orderId=${orderId}`);
        const data = await res.json();
        if (data.success) {
          setTracking(data.tracking);
        } else {
          setError(data.message);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();

    const interval = setInterval(fetchTracking, 20000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (socket && orderId) {
      socket.emit("join_order_room", orderId);

      socket.on("delivery_partner_location_updated", (data: any) => {
        if (data.orderId === orderId) {
          setTracking((prev) =>
            prev
              ? {
                  ...prev,
                  deliveryPartnerLocation: {
                    lat: data.lat,
                    lng: data.lng,
                    updatedAt: data.timestamp,
                  },
                }
              : null,
          );
          setLastUpdateAt(data.timestamp);
        }
      });

      socket.on("order_status_update", (data: any) => {
        if (data.orderId === orderId) {
          const mappedStatus =
            data.status === "picked_up" || data.status === "on_the_way"
              ? "out-for-delivery"
              : data.status;
          setTracking((prev) =>
            prev
              ? {
                  ...prev,
                  status: mappedStatus || prev.status,
                  timeline: {
                    ...prev.timeline,
                    outForDelivery:
                      mappedStatus === "out-for-delivery"
                        ? data.timestamp
                        : prev.timeline.outForDelivery,
                    delivered:
                      mappedStatus === "delivered"
                        ? data.timestamp
                        : prev.timeline.delivered,
                  },
                }
              : null,
          );
          if (data.location) {
            setTracking((prev) =>
              prev
                ? {
                    ...prev,
                    deliveryPartnerLocation: {
                      lat: data.location.lat,
                      lng: data.location.lng,
                      updatedAt: data.timestamp,
                    },
                  }
                : null,
            );
            setLastUpdateAt(data.timestamp);
          }
        }
      });

      return () => {
        socket.off("delivery_partner_location_updated");
        socket.off("order_status_update");
      };
    }
  }, [socket, orderId]);

  if (loading) return <div className="p-6">Loading tracking...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!tracking) return <div className="p-6">No tracking data</div>;

  const latestUpdate =
    tracking.deliveryPartnerLocation?.updatedAt || lastUpdateAt;
  const isStale = latestUpdate
    ? Date.now() - new Date(latestUpdate).getTime() > 60000
    : false;

  const statusSteps = [
    { key: "ordered", label: "Order Placed", time: tracking.timeline.ordered },
    {
      key: "confirmed",
      label: "Confirmed",
      time: tracking.timeline.confirmed,
    },
    { key: "packed", label: "Packed", time: tracking.timeline.packed },
    { key: "shipped", label: "Shipped", time: tracking.timeline.shipped },
    {
      key: "outForDelivery",
      label: "Out for Delivery",
      time: tracking.timeline.outForDelivery,
    },
    {
      key: "delivered",
      label: "Delivered",
      time: tracking.timeline.delivered,
    },
  ];

  const getStatusIndex = () => {
    const statuses = [
      "pending",
      "confirmed",
      "packed",
      "shipped",
      "out-for-delivery",
      "delivered",
    ];
    return statuses.indexOf(tracking.status);
  };

  const currentStatusIndex = getStatusIndex();
  const isDelivered = tracking.status === "delivered";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold">Order #{tracking.orderNumber}</h1>
        <p className="text-gray-600 capitalize">
          Status: {tracking.status.replace(/-/g, " ")}
        </p>
      </div>

      {tracking.deliveryPartnerContact?.mobile && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-semibold text-lg">Contact Delivery Partner</h2>
          <p className="text-sm text-gray-600 mt-1">
            {tracking.deliveryPartnerContact.name || "Delivery Partner"}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleCallPartner}
              disabled={callingPartner}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
            >
              {callingPartner ? "Calling..." : "Call Partner"}
            </button>
            <span className="text-sm text-gray-500">
              {maskPhone(tracking.deliveryPartnerContact.mobile)}
            </span>
          </div>
        </div>
      )}

      {tracking.userLocation && tracking.deliveryPartnerLocation && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-green-500 to-blue-500">
            <h2 className="font-semibold text-lg text-white">
              📍 Live Tracking Map
            </h2>
            <p className="text-sm text-white/90">
              Real-time delivery partner location
            </p>
          </div>

          {/* Visual Map */}
          <div className="h-[500px]">
            <TrackingMap
              customerLocation={[
                tracking.userLocation.lat,
                tracking.userLocation.lng,
              ]}
              deliveryLocation={[
                tracking.deliveryPartnerLocation.lat,
                tracking.deliveryPartnerLocation.lng,
              ]}
              orderNumber={tracking.orderNumber}
              estimatedDistance={tracking.assignment?.estimatedDistance}
              estimatedTime={tracking.assignment?.estimatedTime}
            />
          </div>

          {/* Coordinates Grid */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-semibold mb-2">
                📍 Your Delivery Location
              </p>
              <p className="text-xs text-gray-700">
                Lat: {tracking.userLocation.lat.toFixed(6)} <br />
                Lng: {tracking.userLocation.lng.toFixed(6)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 font-semibold mb-2">
                🚴 Delivery Partner Location
              </p>
              <p className="text-xs text-gray-700">
                Lat: {tracking.deliveryPartnerLocation.lat.toFixed(6)} <br />
                Lng: {tracking.deliveryPartnerLocation.lng.toFixed(6)}
              </p>
              {tracking.deliveryPartnerLocation.updatedAt && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isStale ? "bg-orange-500" : "bg-green-500 animate-pulse"
                    }`}
                  ></span>
                  Updated: {new Date(
                    tracking.deliveryPartnerLocation.updatedAt,
                  ).toLocaleTimeString()}
                  {isStale && (
                    <span className="text-orange-600">(stale)</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="font-semibold text-lg mb-6">Order Timeline</h2>
        <div className="space-y-4">
          {statusSteps.map((step, idx) => (
            <div key={step.key} className="flex items-start">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${
                  idx <= currentStatusIndex
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {idx <= currentStatusIndex ? "✓" : idx + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{step.label}</p>
                {step.time ? (
                  <p className="text-sm text-gray-600">
                    {new Date(step.time).toLocaleString("en-IN")}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Pending</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {tracking.assignment?.timeline?.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-4">Delivery Updates</h2>
          <div className="space-y-2 text-sm">
            {tracking.assignment.timeline.map((item: any, idx: number) => (
              <div
                key={idx}
                className="flex justify-between text-gray-700 pb-2 border-b"
              >
                <span className="font-semibold capitalize">
                  {item.status.replace(/_/g, " ")}
                </span>
                <span className="text-gray-500">
                  {new Date(item.timestamp).toLocaleTimeString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating Component */}
      {isDelivered && tracking.assignment?._id && (
        <DeliveryRating
          assignmentId={tracking.assignment._id}
          onRatingSubmitted={() => {
            console.log("Rating submitted");
          }}
        />
      )}
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading tracking...</div>}>
      <OrderTrackingContent />
    </Suspense>
  );
}
