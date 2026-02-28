"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/contexts/SocketContext";
import Link from "next/link";

interface Assignment {
  _id: string;
  orderNumber: string;
  status: string;
  pickupLocation: any;
  deliveryLocation: any;
  estimatedDistance: number;
  estimatedTime: number;
  distanceFromYou: number;
  priority: string;
  expiresAt: Date;
}

interface Earnings {
  totalEarnings: number;
  deliveryCount: number;
  tipEarnings: number;
  pendingPayout: number;
}

interface Shift {
  _id: string;
  startAt: string;
  endAt: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
}

interface Incentive {
  _id: string;
  title: string;
  description?: string;
  targetDeliveries?: number;
  targetEarnings?: number;
  rewardAmount: number;
  endAt: string;
  progress: number;
  deliveriesDone: number;
  earningsDone: number;
}

interface Payout {
  _id: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  period: {
    startDate: string;
    endDate: string;
  };
  createdAt: string;
}

export const DeliveryBoyDashboard = () => {
  const { data: session, status } = useSession();
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState<"home" | "available" | "active" | "shifts" | "incentives" | "earnings">("home");
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableAssignments, setAvailableAssignments] = useState<Assignment[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<Assignment[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftForm, setShiftForm] = useState({ startAt: "", endAt: "" });
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [incentivesLoading, setIncentivesLoading] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutActionLoading, setPayoutActionLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const locationWatchIdRef = useRef<number | null>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocationSentRef = useRef<number>(0);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    averageRating: 0,
    completionRate: 0,
  });

  // Fetch profile and status
  useEffect(() => {
    if (status === "authenticated") {
      fetchProfile();
      fetchStats();
      fetchShifts();
      fetchIncentives();
      fetchPayouts();
    }
  }, [status]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/delivery-boy/status");
      const data = await res.json();
      if (data.success) {
        setIsOnline(data.status.isOnline);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/delivery-boy/earnings");
      const data = await res.json();
      if (data.success) {
        setEarnings(data.summary);
        setStats({
          totalDeliveries: data.summary.deliveryCount || 0,
          averageRating: data.partner.totalEarnings || 0,
          completionRate: 95,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchShifts = async () => {
    try {
      setShiftLoading(true);
      const res = await fetch("/api/delivery-boy/shifts");
      const data = await res.json();
      if (data.success) {
        setShifts(data.shifts || []);
      }
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setShiftLoading(false);
    }
  };

  const fetchIncentives = async () => {
    try {
      setIncentivesLoading(true);
      const res = await fetch("/api/delivery-boy/incentives");
      const data = await res.json();
      if (data.success) {
        setIncentives(data.incentives || []);
      }
    } catch (error) {
      console.error("Error fetching incentives:", error);
    } finally {
      setIncentivesLoading(false);
    }
  };

  const fetchPayouts = async () => {
    try {
      setPayoutsLoading(true);
      const res = await fetch("/api/delivery-boy/payouts");
      const data = await res.json();
      if (data.success) {
        setPayouts(data.payouts || []);
      }
    } catch (error) {
      console.error("Error fetching payouts:", error);
    } finally {
      setPayoutsLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    try {
      setPayoutActionLoading(true);
      setPayoutError(null);
      const res = await fetch("/api/delivery-boy/payouts", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setPayoutError(data.message || "Failed to request payout");
        return;
      }
      await fetchStats();
      await fetchPayouts();
    } catch (error) {
      console.error("Error requesting payout:", error);
      setPayoutError("Failed to request payout");
    } finally {
      setPayoutActionLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    setIsLoading(true);
    try {
      if (!navigator.geolocation) {
        alert("Geolocation not supported");
        setIsLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const res = await fetch("/api/delivery-boy/status", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              isOnline: !isOnline,
              location: { lat: latitude, lng: longitude },
              gender: "male",
            }),
          });
          const data = await res.json();
          if (data.success) {
            setIsOnline(!isOnline);
          } else {
            alert(data.message || "Unable to update status");
          }
        },
        (error) => {
          alert("Unable to get location: " + error.message);
        },
      );
    } catch (error) {
      console.error("Error toggling online status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableAssignments = async () => {
    try {
      const res = await fetch("/api/delivery-boy/available-assignments");
      const data = await res.json();
      if (data.success) {
        setAvailableAssignments(data.assignments);
      }
    } catch (error) {
      console.error("Error fetching available assignments:", error);
    }
  };

  const fetchActiveAssignments = async () => {
    try {
      const res = await fetch("/api/delivery-boy/assigned-orders?status=assigned,picked_up,on_the_way");
      const data = await res.json();
      if (data.success) {
        setActiveAssignments(data.assignments);
      }
    } catch (error) {
      console.error("Error fetching active assignments:", error);
    }
  };

  const sendLocation = async (lat: number, lng: number) => {
    const now = Date.now();
    if (now - lastLocationSentRef.current < 7000) return;
    lastLocationSentRef.current = now;
    try {
      await fetch("/api/delivery-boy/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
    } catch (error) {
      console.error("Error sending location:", error);
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) return;
    if (locationWatchIdRef.current !== null) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (error) => {
        console.error("Location watch error:", error);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    locationWatchIdRef.current = watchId;

    if (!locationIntervalRef.current) {
      locationIntervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
      }, 12000);
    }
  };

  const stopLocationTracking = () => {
    if (locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (activeTab === "available" && isOnline) {
      fetchAvailableAssignments();
      const interval = setInterval(fetchAvailableAssignments, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab, isOnline]);

  useEffect(() => {
    if (activeTab === "active") {
      fetchActiveAssignments();
      const interval = setInterval(fetchActiveAssignments, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Background poll for active assignments to control tracking
  useEffect(() => {
    if (!isOnline) return;
    fetchActiveAssignments();
    const interval = setInterval(fetchActiveAssignments, 15000);
    return () => clearInterval(interval);
  }, [isOnline]);

  useEffect(() => {
    if (isOnline && activeAssignments.length > 0) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }

    return () => {
      stopLocationTracking();
    };
  }, [isOnline, activeAssignments.length]);

  // Listen for new delivery requests
  useEffect(() => {
    if (socket && isOnline) {
      if (session?.user?.id) {
        socket.emit(
          "join_delivery_room",
          session.user.id,
          session.user.name || "",
          session.user.currentRole || "deliveryBoy",
        );
      }
      socket.on("new_delivery_request", (data) => {
        console.log("New delivery request:", data);
        fetchAvailableAssignments();
      });

      return () => {
        socket.off("new_delivery_request");
        if (session?.user?.id) {
          socket.emit("leave_delivery_room", session.user.id);
        }
      };
    }
  }, [socket, isOnline, session?.user?.id]);

  const handleCreateShift = async () => {
    setShiftError(null);
    if (!shiftForm.startAt || !shiftForm.endAt) {
      setShiftError("Please select both start and end time.");
      return;
    }

    const startDate = new Date(shiftForm.startAt);
    const endDate = new Date(shiftForm.endAt);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setShiftError("Please select valid date and time.");
      return;
    }
    if (endDate <= startDate) {
      setShiftError("End time must be after start time.");
      return;
    }

    try {
      setShiftLoading(true);
      const res = await fetch("/api/delivery-boy/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shiftForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to create shift");
      setShiftForm({ startAt: "", endAt: "" });
      await fetchShifts();
    } catch (error: any) {
      setShiftError(error.message || "Unable to create shift");
    } finally {
      setShiftLoading(false);
    }
  };

  const toLocalInputValue = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const getRoundedNow = () => {
    const date = new Date();
    const minutes = date.getMinutes();
    const rounded = Math.ceil(minutes / 15) * 15;
    if (rounded >= 60) {
      date.setHours(date.getHours() + 1);
      date.setMinutes(0, 0, 0);
    } else {
      date.setMinutes(rounded, 0, 0);
    }
    return date;
  };

  const applyQuickShift = (hours: number) => {
    const baseStart = shiftForm.startAt ? new Date(shiftForm.startAt) : getRoundedNow();
    const start = Number.isNaN(baseStart.getTime()) ? getRoundedNow() : baseStart;
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    setShiftForm({ startAt: toLocalInputValue(start), endAt: toLocalInputValue(end) });
    setShiftError(null);
  };

  const handleShiftAction = async (
    shiftId: string,
    action: "start" | "end" | "cancel",
  ) => {
    try {
      setShiftLoading(true);
      const res = await fetch("/api/delivery-boy/shifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to update shift");
      await fetchShifts();
    } catch (error: any) {
      alert(error.message || "Unable to update shift");
    } finally {
      setShiftLoading(false);
    }
  };

  if (status === "loading") {
    return <div className="p-6">Loading...</div>;
  }

  if (status !== "authenticated") {
    return <div className="p-6">Please login as a delivery partner</div>;
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Delivery Dashboard</h1>
          <button
            onClick={handleToggleOnline}
            disabled={isLoading}
            className={`px-6 py-2 rounded-lg font-semibold text-white transition ${
              isOnline
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {isOnline ? "Go Offline" : "Go Online"}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`${isOnline ? "bg-green-50 border-green-200" : "bg-gray-100 border-gray-200"} border-b p-4`}>
        <div className="max-w-7xl mx-auto">
          <p className={`font-semibold ${isOnline ? "text-green-700" : "text-gray-700"}`}>
            Status: {isOnline ? "🟢 Online" : "⚫ Offline"}
          </p>
          {isOnline && (
            <p className="text-sm text-green-600 mt-1">
              Ready to accept deliveries. Refresh to see new orders.
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-8 overflow-x-auto">
            {['home', 'available', 'active', 'shifts', 'incentives', 'earnings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-2 border-b-2 font-semibold transition capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab === "home" && "Dashboard"}
                {tab === "available" && "Available Orders"}
                {tab === "active" && "Active Deliveries"}
                {tab === "shifts" && "My Shifts"}
                {tab === "incentives" && "Incentives"}
                {tab === "earnings" && "Earnings"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Home Tab */}
        {activeTab === "home" && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Total Deliveries</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalDeliveries}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Rating</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">4.8 ⭐</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Completion Rate</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.completionRate}%</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm">Today's Earnings</p>
                <p className="text-3xl font-bold text-green-600 mt-2">₹{earnings?.totalEarnings || 0}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link
                href="/delivery-boy/assignments"
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="text-3xl mb-2">📦</div>
                <h3 className="font-bold text-lg">My Assignments</h3>
                <p className="text-blue-100 text-sm mt-2">View all your order assignments</p>
              </Link>

              <Link
                href="/delivery-boy/bank-details"
                className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="text-3xl mb-2">🏦</div>
                <h3 className="font-bold text-lg">Bank Details</h3>
                <p className="text-green-100 text-sm mt-2">Manage payout account info</p>
              </Link>

              <Link
                href="/delivery-boy/profile"
                className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="text-3xl mb-2">👤</div>
                <h3 className="font-bold text-lg">My Profile</h3>
                <p className="text-purple-100 text-sm mt-2">Edit personal information</p>
              </Link>

              <Link
                href="/delivery-boy/kyc"
                className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="text-3xl mb-2">🪪</div>
                <h3 className="font-bold text-lg">KYC Verification</h3>
                <p className="text-orange-100 text-sm mt-2">Upload and track KYC status</p>
              </Link>
            </div>
          </div>
        )}

        {/* Available Orders Tab */}
        {activeTab === "available" && (
          <div>
            {!isOnline ? (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-yellow-800">
                  Please go online to see available delivery orders.
                </p>
              </div>
            ) : availableAssignments.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-center">
                <p className="text-gray-600">No available orders right now. Check back soon!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableAssignments.map((assignment) => (
                  <div key={assignment._id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">Order #{assignment.orderNumber}</h3>
                        <p className="text-sm text-gray-600">
                          Priority: <span className="font-semibold">{assignment.priority}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">₹200</p>
                        <p className="text-sm text-gray-600">Distance: {assignment.distanceFromYou} km</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">📍 Pickup From</p>
                        <p className="font-semibold">{assignment.pickupLocation.address.substring(0, 50)}...</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">📍 Delivery To</p>
                        <p className="font-semibold">{assignment.deliveryLocation.address.substring(0, 50)}...</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mb-4">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        Est. {assignment.estimatedTime} min
                      </span>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        {assignment.estimatedDistance} km
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/delivery-boy/assignments/${assignment._id}`}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded font-semibold text-center transition"
                      >
                        Accept & View Details
                      </Link>
                      <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded font-semibold transition">
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Deliveries Tab */}
        {activeTab === "active" && (
          <div className="space-y-4">
            {activeAssignments.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-center">
                <p className="text-gray-600">No active deliveries</p>
              </div>
            ) : (
              activeAssignments.map((assignment) => (
                <Link
                  key={assignment._id}
                  href={`/delivery-boy/assignments/${assignment._id}`}
                  className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">Order #{assignment.orderNumber}</h3>
                      <p className="text-sm text-gray-600 capitalize">Status: {assignment.status.replace(/_/g, " ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">📍 View</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === "earnings" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                <p className="text-green-700 font-semibold">Pending Payout</p>
                <p className="text-3xl font-bold text-green-600 mt-2">₹{earnings?.pendingPayout || 0}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                <p className="text-blue-700 font-semibold">This Month</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">₹{earnings?.deliveryCount || 0}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-6 rounded-lg">
                <p className="text-purple-700 font-semibold">Tips Received</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">₹{earnings?.tipEarnings || 0}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-bold text-lg mb-4">Payout Info</h3>
              <p className="text-gray-600">Payouts are processed weekly on Fridays to your registered bank account.</p>
              <p className="text-sm text-gray-500 mt-2">Next payout: Friday, Next Week</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="font-bold text-lg">Request Payout</h3>
                  <p className="text-sm text-gray-600">
                    Move your pending balance to a payout request.
                  </p>
                </div>
                <button
                  onClick={handleRequestPayout}
                  disabled={payoutActionLoading || (earnings?.pendingPayout || 0) <= 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {payoutActionLoading ? "Requesting..." : "Request Payout"}
                </button>
              </div>
              {payoutError && (
                <p className="text-sm text-red-600 mt-3">{payoutError}</p>
              )}
              {(earnings?.pendingPayout || 0) <= 0 && (
                <p className="text-sm text-gray-500 mt-3">
                  No pending payout available yet.
                </p>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Recent Payouts</h3>
                <Link
                  href="/delivery-boy/payouts"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View all
                </Link>
              </div>
              {payoutsLoading ? (
                <p className="text-gray-600">Loading payouts...</p>
              ) : payouts.length === 0 ? (
                <p className="text-gray-600">No payouts yet.</p>
              ) : (
                <div className="space-y-3">
                  {payouts.slice(0, 5).map((payout) => (
                    <div key={payout._id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border rounded-lg p-3">
                      <div>
                        <p className="font-semibold">₹{payout.amount}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(payout.period.startDate).toLocaleDateString("en-IN")} - {new Date(payout.period.endDate).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                          payout.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : payout.status === "processing"
                              ? "bg-blue-100 text-blue-700"
                              : payout.status === "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {payout.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Incentives Tab */}
        {activeTab === "incentives" && (
          <div className="space-y-4">
            {incentivesLoading ? (
              <div className="bg-white p-6 rounded-lg shadow">Loading incentives...</div>
            ) : incentives.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600">No active incentives right now.</p>
              </div>
            ) : (
              incentives.map((inc) => (
                <div key={inc._id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold">{inc.title}</h3>
                      {inc.description && (
                        <p className="text-sm text-gray-600 mt-1">{inc.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Ends: {new Date(inc.endAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Reward</p>
                      <p className="text-2xl font-bold text-green-600">₹{inc.rewardAmount}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-green-500"
                        style={{ width: `${inc.progress}%` }}
                      />
                    </div>
                    <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-4">
                      {inc.targetDeliveries ? (
                        <span>
                          Deliveries: {inc.deliveriesDone}/{inc.targetDeliveries}
                        </span>
                      ) : null}
                      {inc.targetEarnings ? (
                        <span>
                          Earnings: ₹{inc.earningsDone}/{inc.targetEarnings}
                        </span>
                      ) : null}
                      <span>{inc.progress}% complete</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Shifts Tab */}
        {activeTab === "shifts" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-lg">Schedule a Shift</h3>
                  <p className="text-sm text-gray-500">Pick a time or use a quick preset.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 4, 6, 8].map((hours) => (
                    <button
                      key={hours}
                      onClick={() => applyQuickShift(hours)}
                      className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
                    >
                      {hours} hr
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Start</label>
                  <input
                    type="datetime-local"
                    value={shiftForm.startAt}
                    onChange={(e) => {
                      setShiftForm((prev) => ({ ...prev, startAt: e.target.value }));
                      setShiftError(null);
                    }}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">End</label>
                  <input
                    type="datetime-local"
                    value={shiftForm.endAt}
                    min={shiftForm.startAt || undefined}
                    onChange={(e) => {
                      setShiftForm((prev) => ({ ...prev, endAt: e.target.value }));
                      setShiftError(null);
                    }}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleCreateShift}
                    disabled={shiftLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
                  >
                    Create Shift
                  </button>
                </div>
              </div>
              {shiftError && (
                <div className="mt-3 text-sm text-red-600">
                  {shiftError}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-bold text-lg mb-4">Your Shifts</h3>
              {shiftLoading ? (
                <div className="text-gray-600">Loading shifts...</div>
              ) : shifts.length === 0 ? (
                <div className="text-gray-600">No shifts scheduled yet.</div>
              ) : (
                <div className="space-y-3">
                  {shifts.map((shift) => {
                    const start = new Date(shift.startAt);
                    const end = new Date(shift.endAt);
                    const now = new Date();
                    const earlyStartMinutes = 15;
                    const earlyWindowStart = new Date(start.getTime() - earlyStartMinutes * 60 * 1000);
                    const canStart = now >= earlyWindowStart && now <= end;
                    return (
                      <div
                        key={shift._id}
                        className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-semibold">
                            {start.toLocaleString("en-IN")} → {end.toLocaleString("en-IN")}
                          </p>
                          <p className="text-sm text-gray-600">Status: {shift.status}</p>
                          {shift.status === "scheduled" && !canStart && (
                            <p className="text-xs text-gray-500 mt-1">
                              You can start up to {earlyStartMinutes} min before start time.
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3 md:mt-0">
                          {shift.status === "scheduled" && (
                            <>
                              <button
                                onClick={() => handleShiftAction(shift._id, "start")}
                                disabled={!canStart}
                                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Start
                              </button>
                              <button
                                onClick={() => handleShiftAction(shift._id, "cancel")}
                                className="px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {shift.status === "active" && (
                            <button
                              onClick={() => handleShiftAction(shift._id, "end")}
                              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              End Shift
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryBoyDashboard;