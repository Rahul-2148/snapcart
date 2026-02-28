// src/app/return/tracking/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSocket } from "@/contexts/SocketContext";
import dynamic from "next/dynamic";
import { Clock, Package, Truck, CheckCircle } from "lucide-react";

const TrackingMap = dynamic(
  () => import("@/components/TrackingMap").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
    ),
  },
);

interface ReturnDetails {
  _id: string;
  status: string;
  requestType: string;
  pickupLocation?: {
    address: string;
    coordinates: [number, number];
  };
  deliveryPartner?: {
    _id: string;
    name: string;
    mobileNumber: string;
  };
  requestedAt: string;
  approvedAt?: string;
  pickedUpAt?: string;
  receivedAt?: string;
}

export default function ReturnTrackingPage() {
  const searchParams = useSearchParams();
  const returnId = searchParams.get("returnId");
  const socket = useSocket();

  const [returnData, setReturnData] = useState<ReturnDetails | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<
    [number, number] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!returnId) return;
    fetchReturnDetails();
  }, [returnId]);

  useEffect(() => {
    if (!socket || !returnId || !returnData?.deliveryPartner) return;

    // Join return-specific room
    socket.emit("join_return_room", { returnId });

    // Listen for partner location updates
    socket.on("delivery_partner_location_updated", (data) => {
      if (data.location) {
        setPartnerLocation([data.location.lat, data.location.lng]);
        setLastUpdate(new Date());
      }
    });

    socket.on("return:status-changed", () => {
      fetchReturnDetails();
    });

    // Polling fallback (every 20 seconds)
    const interval = setInterval(() => {
      fetchReturnDetails();
    }, 20000);

    return () => {
      socket.off("delivery_partner_location_updated");
      socket.off("return:status-changed");
      clearInterval(interval);
    };
  }, [socket, returnId, returnData?.deliveryPartner]);

  const fetchReturnDetails = async () => {
    if (!returnId) return;

    try {
      const res = await fetch(`/api/returns/${returnId}`);
      if (!res.ok) throw new Error("Failed to fetch return details");
      const data = await res.json();
      setReturnData(data);

      // If partner is assigned, fetch their current location
      if (data.deliveryPartner?._id) {
        const partnerRes = await fetch(
          `/api/delivery-boy/${data.deliveryPartner._id}/location`,
        );
        if (partnerRes.ok) {
          const locationData = await partnerRes.json();
          if (locationData.location) {
            setPartnerLocation([
              locationData.location.lat,
              locationData.location.lng,
            ]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching return details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = () => {
    return [
      {
        label: "Requested",
        date: returnData?.requestedAt,
        icon: Package,
        active: true,
      },
      {
        label: "Approved",
        date: returnData?.approvedAt,
        icon: CheckCircle,
        active: !!returnData?.approvedAt,
      },
      {
        label: "Picked Up",
        date: returnData?.pickedUpAt,
        icon: Truck,
        active: !!returnData?.pickedUpAt,
      },
      {
        label: "Received",
        date: returnData?.receivedAt,
        icon: CheckCircle,
        active: !!returnData?.receivedAt,
      },
    ];
  };

  const isStale = lastUpdate && Date.now() - lastUpdate.getTime() > 60000;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Return Not Found
          </h2>
          <p className="text-gray-600">
            The return request could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Return Pickup Tracking
          </h1>
          <p className="text-gray-600 mt-2">
            Track your return pickup in real-time
          </p>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            {getStatusSteps().map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex-1 relative">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        step.active
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <p
                      className={`text-sm font-medium mt-2 ${
                        step.active ? "text-gray-900" : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(step.date).toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                  {index < getStatusSteps().length - 1 && (
                    <div
                      className={`absolute top-6 left-1/2 w-full h-0.5 ${
                        getStatusSteps()[index + 1].active
                          ? "bg-green-600"
                          : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Partner Info */}
        {returnData.deliveryPartner && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Pickup Partner</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {returnData.deliveryPartner.name}
                </p>
                <p className="text-sm text-gray-600">
                  {returnData.deliveryPartner.mobileNumber}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live Map */}
        {returnData.pickupLocation &&
          partnerLocation &&
          returnData.status !== "received" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Live Tracking</h2>
                {isStale && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                    Location may be outdated
                  </span>
                )}
              </div>
              <div className="h-96 rounded-lg overflow-hidden">
                <TrackingMap
                  customerLocation={returnData.pickupLocation.coordinates}
                  deliveryLocation={partnerLocation}
                  orderNumber={`Return #${returnData._id.slice(-6)}`}
                />
              </div>
              <p className="text-sm text-gray-600 mt-4">
                📍 Pickup Location: {returnData.pickupLocation.address}
              </p>
            </div>
          )}

        {(returnData.status === "received" ||
          returnData.status === "completed") && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-green-900 mb-2">
              Return Received Successfully!
            </h3>
            <p className="text-green-700">
              Your return has been received. Refund processing will begin
              shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
