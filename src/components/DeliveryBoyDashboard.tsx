// src/components/DeliveryBoyDashboard.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSocket } from "@/contexts/SocketContext";
import Link from "next/link";
import { toast } from "sonner";
import { NotificationDropdown } from "@/components/common/NotificationDropdown";
import {
  ShieldCheck,
  MapPin,
  Clock,
  LogOut,
  User,
  IndianRupee,
  Activity,
  TrendingUp,
  Award,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Truck,
  Plus,
  ArrowLeftRight
} from "lucide-react";

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
  cashInHand?: number;
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
  status: "pending" | "approved" | "rejected";
  paymentDetails: {
    type: "upi" | "bank";
    upiId?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    holderName?: string;
  };
  createdAt: string;
}

export const DeliveryBoyDashboard = () => {
  const { data: session, status } = useSession();
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState<"home" | "available" | "active" | "shifts" | "incentives" | "earnings" | "settings">("home");
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>("approved");
  const [kycRejectionReason, setKycRejectionReason] = useState<string>("");
  const [availableAssignments, setAvailableAssignments] = useState<Assignment[]>([]);
  const [prevAvailableCount, setPrevAvailableCount] = useState<number | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsProfile, setSettingsProfile] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    vehicleType: "bicycle",
    payoutDetails: {
      type: "upi" as "upi" | "bank",
      upiId: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      holderName: "",
    },
    kycStatus: "not_submitted",
  });
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

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: "",
    type: "upi" as "upi" | "bank",
    upiId: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    holderName: "",
  });

  // Cash Deposits State
  const [deposits, setDeposits] = useState<any[]>([]);
  const [depositStores, setDepositStores] = useState<any[]>([]);
  const [depositLoading, setDepositLoading] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositForm, setDepositForm] = useState({
    amount: "",
    method: "upi" as "upi" | "store_manager",
    transactionId: "",
    storeId: "",
  });
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState(false);

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
      fetchKycStatus();
      fetchStats();
      fetchShifts();
      fetchIncentives();
      fetchPayouts();
      fetchCashDeposits();
      fetchSettingsProfile();
    }
  }, [status]);

  const playPingSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };
      const now = ctx.currentTime;
      playTone(880, now, 0.15);
      playTone(1320, now + 0.1, 0.35);
    } catch (e) {
      console.warn("Audio Context failed to play sound:", e);
    }
  };

  useEffect(() => {
    if (isOnline && prevAvailableCount !== null && availableAssignments.length > prevAvailableCount) {
      playPingSound();
      toast.info("New available delivery order nearby!");
    }
    setPrevAvailableCount(availableAssignments.length);
  }, [availableAssignments.length, isOnline]);

  const fetchSettingsProfile = async () => {
    try {
      setSettingsLoading(true);
      const res = await fetch("/api/delivery-boy/profile");
      const data = await res.json();
      if (data.success) {
        setSettingsProfile(data.profile);
      }
    } catch (error) {
      console.error("Error fetching settings profile:", error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSettingsLoading(true);
      const res = await fetch("/api/delivery-boy/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsProfile),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsProfile(data.profile);
        toast.success("Profile settings updated successfully!");
        fetchProfile();
      } else {
        toast.error(data.message || "Failed to update profile settings");
      }
    } catch (error) {
      console.error("Error updating profile settings:", error);
      toast.error("An error occurred while updating profile settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSwitchToShopper = async () => {
    try {
      setSettingsLoading(true);
      const res = await fetch("/api/user/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Switched to Shopper role successfully!");
        window.location.href = "/user/account/profile";
      } else {
        toast.error(data.message || "Failed to switch role");
      }
    } catch (error) {
      console.error("Error switching role:", error);
      toast.error("An error occurred while switching role");
    } finally {
      setSettingsLoading(false);
    }
  };

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

  const fetchKycStatus = async () => {
    try {
      const res = await fetch("/api/delivery-boy/kyc");
      const data = await res.json();
      if (data.success) {
        setKycStatus(data.kyc?.status || "not_submitted");
        setKycRejectionReason(data.kyc?.rejectionReason || "");
      }
    } catch (error) {
      console.error("Error fetching KYC status:", error);
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
          averageRating: data.partner.stats?.averageRating || 0,
          completionRate: data.partner.stats?.totalDeliveries
            ? Math.round(((data.partner.stats.totalDeliveries - (data.partner.stats.cancelledDeliveries || 0)) / data.partner.stats.totalDeliveries) * 100)
            : 100,
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
        setWalletBalance(data.balance || 0);
        setPayouts(data.withdrawals || []);
      }
    } catch (error) {
      console.error("Error fetching payouts:", error);
    } finally {
      setPayoutsLoading(false);
    }
  };

  const fetchCashDeposits = async () => {
    try {
      const res = await fetch("/api/delivery-boy/cash-deposit");
      const data = await res.json();
      if (data.success) {
        setDeposits(data.deposits || []);
        setDepositStores(data.stores || []);
      }
    } catch (error) {
      console.error("Error fetching cash deposits:", error);
    }
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);
    setDepositSuccess(false);

    const amt = parseFloat(depositForm.amount);
    if (Number.isNaN(amt) || amt <= 0) {
      setDepositError("Please enter a valid deposit amount.");
      return;
    }

    const cash = earnings?.cashInHand || 0;
    if (amt > cash) {
      setDepositError(`Deposit amount cannot exceed Cash In Hand (₹${cash}).`);
      return;
    }

    if (depositForm.method === "store_manager" && !depositForm.storeId) {
      setDepositError("Please select a store to handover cash.");
      return;
    }

    try {
      setDepositLoading(true);
      const res = await fetch("/api/delivery-boy/cash-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          method: depositForm.method,
          transactionId: depositForm.transactionId,
          storeId: depositForm.storeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit cash deposit");
      }

      setDepositSuccess(true);
      setDepositForm({
        amount: "",
        method: "upi",
        transactionId: "",
        storeId: "",
      });
      await fetchStats();
      await fetchCashDeposits();

      setTimeout(() => {
        setIsDepositModalOpen(false);
        setDepositSuccess(false);
      }, 1500);
    } catch (error: any) {
      setDepositError(error.message || "Failed to submit cash deposit");
    } finally {
      setDepositLoading(false);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError(null);

    const amt = parseFloat(payoutForm.amount);
    if (Number.isNaN(amt) || amt <= 0) {
      setPayoutError("Please enter a valid payout amount.");
      return;
    }

    if (amt > walletBalance) {
      setPayoutError(`Payout amount cannot exceed Wallet Balance (₹${walletBalance.toFixed(2)}).`);
      return;
    }

    const paymentDetails: any = { type: payoutForm.type };
    if (payoutForm.type === "upi") {
      if (!payoutForm.upiId.trim()) {
        setPayoutError("UPI ID is required.");
        return;
      }
      paymentDetails.upiId = payoutForm.upiId.trim();
    } else {
      if (
        !payoutForm.bankName.trim() ||
        !payoutForm.accountNumber.trim() ||
        !payoutForm.ifscCode.trim() ||
        !payoutForm.holderName.trim()
      ) {
        setPayoutError("All bank account details are required.");
        return;
      }
      paymentDetails.bankName = payoutForm.bankName.trim();
      paymentDetails.accountNumber = payoutForm.accountNumber.trim();
      paymentDetails.ifscCode = payoutForm.ifscCode.trim();
      paymentDetails.holderName = payoutForm.holderName.trim();
    }

    try {
      setPayoutActionLoading(true);
      const res = await fetch("/api/delivery-boy/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          paymentDetails,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPayoutError(data.message || "Failed to request payout");
        return;
      }

      toast.success("Payout request submitted successfully!");
      setIsPayoutModalOpen(false);
      setPayoutForm({
        amount: "",
        type: "upi",
        upiId: "",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        holderName: "",
      });
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-2">
          <Loader2Icon className="w-8 h-8 text-green-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading logistics console...</p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated" || !session?.user?.id) {
    return <div className="p-8 text-center text-slate-400">Please log in as a delivery partner.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 relative overflow-hidden">
      {/* Background radial glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-green-600/10">
              SC
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wide text-white leading-tight">SnapCart Delivery</h1>
              <p className="text-[10px] text-green-400 font-semibold tracking-wider uppercase">Partner Terminal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status pulsing bar */}
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full relative flex`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? "bg-green-400" : "bg-slate-500"}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? "bg-green-500" : "bg-slate-500"}`}></span>
              </span>
              <span className={`text-xs font-bold uppercase ${isOnline ? "text-green-400" : "text-slate-400"}`}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            <button
              onClick={handleToggleOnline}
              disabled={isLoading}
              className={`px-4 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wide transition cursor-pointer shadow-md flex items-center gap-1.5 ${isOnline
                  ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                  : "bg-green-600 text-white hover:bg-green-700 shadow-green-600/10"
                }`}
            >
              <Activity className="w-3.5 h-3.5" />
              {isOnline ? "Go Offline" : "Go Online"}
            </button>

            {/* Global notification bell with Read/Unread filters */}
            <NotificationDropdown userId={session.user.id} fullName={session.user.name || "Delivery Boy"} />

            {/* Profile Sign out */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              title="Logout session"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 relative z-10 space-y-6">

        {/* Cash In Hand Limit warning banner */}
        {(earnings?.cashInHand || 0) >= 2000 && (
          <div className="bg-red-950/20 border border-red-500/35 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-pulse">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-red-200 text-sm">Action Required: Cash Limit Exceeded</h3>
                <p className="text-xs text-red-400/80 mt-0.5">Your Cash In Hand (₹{earnings?.cashInHand}) has exceeded the ₹2,000 threshold. Settle cash to go online.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("earnings")}
              className="bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-red-600 transition shadow-lg shadow-red-500/10 cursor-pointer"
            >
              Deposit Cash Now
            </button>
          </div>
        )}

        {/* KYC Verification Clearance Banner */}
        {kycStatus === "approved" ? (
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">KYC Operational Clearance</h3>
                <p className="text-xs text-slate-400 mt-0.5">Your logistics credentials are approved for instant commerce fulfillment.</p>
              </div>
            </div>
            <Link
              href="/delivery-boy/kyc"
              className="bg-slate-800 text-slate-355 font-bold text-xs px-4 py-2 rounded-xl hover:bg-slate-700 transition cursor-pointer"
            >
              View KYC Documents
            </Link>
          </div>
        ) : kycStatus === "pending" ? (
          <div className="bg-amber-950/15 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-amber-200 text-sm">KYC Verification Under Review</h3>
                <p className="text-xs text-amber-400/80 mt-0.5">Your manual document upload is currently under review by compliance.</p>
              </div>
            </div>
            <Link
              href="/delivery-boy/kyc"
              className="bg-amber-500 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition shadow-lg shadow-amber-500/10 cursor-pointer"
            >
              Check KYC Details
            </Link>
          </div>
        ) : (
          <div className="bg-red-950/15 border border-red-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-red-200 text-sm">Action Required: KYC Verification Needed</h3>
                <p className="text-xs text-red-400/80 mt-0.5">
                  {kycStatus === "rejected"
                    ? `KYC rejected: ${kycRejectionReason || "Invalid documents"}. Please update documents to unlock delivery duties.`
                    : "Complete identity verification to enable toggling online status and accept orders."}
                </p>
              </div>
            </div>
            <Link
              href="/delivery-boy/kyc"
              className="bg-red-600 hover:bg-red-750 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-red-500/10 cursor-pointer"
            >
              Verify KYC Now
            </Link>
          </div>
        )}

        {/* Tab switcher buttons */}
        <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-hide py-1">
          {['home', 'available', 'active', 'shifts', 'incentives', 'earnings', 'settings'].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-3.5 px-4 font-bold text-xs uppercase tracking-wider transition-all relative border-b-2 flex-shrink-0 cursor-pointer ${isActive
                    ? "border-green-500 text-green-400 font-extrabold"
                    : "border-transparent text-slate-400 hover:text-white"
                  }`}
              >
                {tab === "home" && "Terminal overview"}
                {tab === "available" && `Available Orders (${availableAssignments.length})`}
                {tab === "active" && `Active shipments (${activeAssignments.length})`}
                {tab === "shifts" && "Shift manager"}
                {tab === "incentives" && "Rewards & Incentives"}
                {tab === "earnings" && "Payout console"}
                {tab === "settings" && "Account Settings"}
              </button>
            );
          })}
        </div>

        {/* Dynamic tabs render */}
        <div>
          {/* 1. Terminal Overview Tab */}
          {activeTab === "home" && (
            <div className="space-y-6">
              {/* Stats Cards grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase">Total orders</span>
                    <h4 className="text-2xl font-extrabold text-white mt-1">{stats.totalDeliveries}</h4>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400"><Truck className="w-5 h-5" /></div>
                </div>

                <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase">Today's Earnings</span>
                    <h4 className="text-2xl font-extrabold text-green-400 mt-1">₹{earnings?.totalEarnings || 0}</h4>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400"><IndianRupee className="w-5 h-5" /></div>
                </div>

                <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase">Completion Rate</span>
                    <h4 className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.completionRate}%</h4>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400"><TrendingUp className="w-5 h-5" /></div>
                </div>

                <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase">Partner Rating</span>
                    <h4 className="text-2xl font-extrabold text-amber-400 mt-1">
                      {stats.averageRating ? stats.averageRating.toFixed(1) : "0.0"} ⭐
                    </h4>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400"><Award className="w-5 h-5" /></div>
                </div>
              </div>

              {/* Daily Incentive Progress (if any active incentives exist) */}
              {incentives.length > 0 && (
                <div className="pt-2">
                  <IncentiveGauge
                    progress={incentives[0].progress}
                    title={incentives[0].title}
                    reward={incentives[0].rewardAmount}
                    description={incentives[0].description}
                    targetDeliveries={incentives[0].targetDeliveries}
                    deliveriesDone={incentives[0].deliveriesDone}
                    targetEarnings={incentives[0].targetEarnings}
                    earningsDone={incentives[0].earningsDone}
                    endAt={incentives[0].endAt}
                  />
                </div>
              )}

              {/* Quick Preset Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                <button
                  onClick={() => setActiveTab("available")}
                  className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-green-600/30 rounded-2xl p-6 text-left transition group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 mb-4 group-hover:scale-110 transition-transform">
                    <Truck className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-base">Browse Shipments</h3>
                  <p className="text-xs text-slate-400 mt-1.5">View broadcasted delivery assignments nearby.</p>
                </button>

                <button
                  onClick={() => setActiveTab("shifts")}
                  className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-green-600/30 rounded-2xl p-6 text-left transition group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-base">Shift Scheduler</h3>
                  <p className="text-xs text-slate-400 mt-1.5">Configure active time windows to obtain orders.</p>
                </button>

                <button
                  onClick={() => setActiveTab("earnings")}
                  className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-green-600/30 rounded-2xl p-6 text-left transition group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-base">Payout Console</h3>
                  <p className="text-xs text-slate-400 mt-1.5">Request manual payouts and track transactions.</p>
                </button>
              </div>
            </div>
          )}

          {/* 2. Available Orders Tab */}
          {activeTab === "available" && (
            <div className="space-y-4">
              {!isOnline ? (
                <div className="bg-amber-950/20 border border-amber-500/30 p-5 rounded-2xl flex items-start gap-3 text-amber-400 max-w-2xl">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
                  <div className="text-xs">
                    <p className="font-bold">Partner Offline</p>
                    <p className="mt-1 text-amber-400/80">Please toggle your state to <strong>ONLINE</strong> to receive available nearby grocery delivery orders.</p>
                  </div>
                </div>
              ) : availableAssignments.length === 0 ? (
                <div className="bg-slate-900/20 border border-slate-850 p-12 text-center rounded-2xl">
                  <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="font-bold text-white text-sm">No assignments active</h4>
                  <p className="text-xs text-slate-500 mt-1">There are no orders broadcasted in your region right now. Keeping listening...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableAssignments.map((assignment) => (
                    <div key={assignment._id} className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between hover:border-green-500/30 transition shadow-lg relative overflow-hidden">
                      {/* Priority Tag */}
                      <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none overflow-hidden">
                        <span className={`absolute top-4 right-[-24px] rotate-45 text-[9px] font-bold py-1 w-28 text-center uppercase tracking-wide ${assignment.priority === "high" ? "bg-red-500 text-white" : "bg-indigo-500 text-white"
                          }`}>
                          {assignment.priority}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Active Broadcast</span>
                          <h3 className="font-extrabold text-white text-base mt-0.5">Order #{assignment.orderNumber}</h3>
                        </div>

                        <div className="space-y-3 text-xs text-slate-300">
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wide">📍 Store Pick-up</p>
                            <p className="font-semibold mt-0.5 line-clamp-1">{assignment.pickupLocation?.address}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wide">📍 Customer Drop</p>
                            <p className="font-semibold mt-0.5 line-clamp-1">{assignment.deliveryLocation?.address}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <span className="bg-slate-800 border border-slate-700/60 text-slate-300 text-[10px] px-2.5 py-1 rounded-lg font-bold">
                            ⌛ {assignment.estimatedTime} mins
                          </span>
                          <span className="bg-slate-800 border border-slate-700/60 text-slate-300 text-[10px] px-2.5 py-1 rounded-lg font-bold">
                            🚴 {assignment.estimatedDistance} km distance
                          </span>
                          <span className="bg-green-950/40 border border-green-500/30 text-green-400 text-[10px] px-2.5 py-1 rounded-lg font-bold">
                            ⚡ {assignment.distanceFromYou} km away
                          </span>
                        </div>

                        {assignment.expiresAt && (
                          <AssignmentCountdown
                            expiresAt={assignment.expiresAt}
                            createdAt={(assignment as any).createdAt}
                            onExpired={fetchAvailableAssignments}
                          />
                        )}
                      </div>

                      <div className="flex gap-3 pt-5 mt-4 border-t border-slate-800/80">
                        <Link
                          href={`/delivery-boy/assignments/${assignment._id}`}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold text-center text-xs transition cursor-pointer shadow-md shadow-green-600/10"
                        >
                          Accept Assignment
                        </Link>
                        <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition">
                          Skip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Active Deliveries Tab */}
          {activeTab === "active" && (
            <div className="space-y-4">
              {activeAssignments.length === 0 ? (
                <div className="bg-slate-900/20 border border-slate-850 p-12 text-center rounded-2xl">
                  <CheckCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="font-bold text-white text-sm">No Active Deliveries</h4>
                  <p className="text-xs text-slate-500 mt-1">Accept an available order to start coordinates mapping and tracking.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeAssignments.map((assignment) => (
                    <Link
                      key={assignment._id}
                      href={`/delivery-boy/assignments/${assignment._id}`}
                      className="block bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl hover:border-green-500/30 transition shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] bg-green-950/40 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                            {assignment.status.replace(/_/g, " ")}
                          </span>
                          <h3 className="font-extrabold text-white text-base mt-2">Order #{assignment.orderNumber}</h3>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-green-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Shift Manager Tab */}
          {activeTab === "shifts" && (
            <div className="space-y-6">
              {/* Schedule shift card */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-white text-base">Schedule a Shift</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Select a shift preset or specify start/end windows.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 4, 6, 8].map((hours) => (
                      <button
                        key={hours}
                        onClick={() => applyQuickShift(hours)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
                      >
                        {hours} hr
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Time</label>
                    <input
                      type="datetime-local"
                      value={shiftForm.startAt}
                      onChange={(e) => {
                        setShiftForm((prev) => ({ ...prev, startAt: e.target.value }));
                        setShiftError(null);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Time</label>
                    <input
                      type="datetime-local"
                      value={shiftForm.endAt}
                      min={shiftForm.startAt || undefined}
                      onChange={(e) => {
                        setShiftForm((prev) => ({ ...prev, endAt: e.target.value }));
                        setShiftError(null);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500 outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleCreateShift}
                      disabled={shiftLoading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-xl transition cursor-pointer text-xs shadow-md shadow-green-600/10 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Create Shift
                    </button>
                  </div>
                </div>

                {shiftError && (
                  <p className="text-xs text-red-500 font-semibold">{shiftError}</p>
                )}
              </div>

              {/* Your shifts list */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
                <h3 className="font-bold text-white text-base">Your Schedule logs</h3>
                {shiftLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2Icon className="w-5 h-5 text-slate-400 animate-spin" />
                    <span className="text-xs text-slate-500">Updating shift schedule...</span>
                  </div>
                ) : shifts.length === 0 ? (
                  <p className="text-xs text-slate-500">No shifts scheduled yet.</p>
                ) : (
                  <div className="divide-y divide-slate-800/80">
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
                          className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div>
                            <p className="font-bold text-sm text-white">
                              {start.toLocaleString("en-IN")} → {end.toLocaleString("en-IN")}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${shift.status === "active" ? "bg-green-950 text-green-400" :
                                  shift.status === "completed" ? "bg-indigo-950 text-indigo-400" :
                                    "bg-slate-800 text-slate-400"
                                }`}>
                                {shift.status}
                              </span>
                              {shift.status === "scheduled" && !canStart && (
                                <span className="text-[10px] text-slate-500">
                                  (Activates up to {earlyStartMinutes} mins early)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {shift.status === "scheduled" && (
                              <>
                                <button
                                  onClick={() => handleShiftAction(shift._id, "start")}
                                  disabled={!canStart}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Start
                                </button>
                                <button
                                  onClick={() => handleShiftAction(shift._id, "cancel")}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {shift.status === "active" && (
                              <button
                                onClick={() => handleShiftAction(shift._id, "end")}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition"
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

          {/* 5. Rewards & Incentives Tab */}
          {activeTab === "incentives" && (
            <div className="space-y-4">
              {incentivesLoading ? (
                <div className="text-xs text-slate-500 py-6">Loading incentives...</div>
              ) : incentives.length === 0 ? (
                <div className="bg-slate-900/20 border border-slate-850 p-12 text-center rounded-2xl">
                  <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="font-bold text-white text-sm">No Active Rewards</h4>
                  <p className="text-xs text-slate-500 mt-1">Check back later for seasonal incentive goals.</p>
                </div>
              ) : (
                incentives.map((inc) => (
                  <IncentiveGauge
                    key={inc._id}
                    progress={inc.progress}
                    title={inc.title}
                    reward={inc.rewardAmount}
                    description={inc.description}
                    targetDeliveries={inc.targetDeliveries}
                    deliveriesDone={inc.deliveriesDone}
                    targetEarnings={inc.targetEarnings}
                    earningsDone={inc.earningsDone}
                    endAt={inc.endAt}
                  />
                ))
              )}
            </div>
          )}

          {/* 6. Payout Console Tab */}
          {activeTab === "earnings" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Top Earnings Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/35 border border-slate-800/80 p-5 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Wallet Balance</span>
                  <p className="text-2xl font-extrabold text-green-400 mt-1">₹{walletBalance.toFixed(2)}</p>
                </div>
                <div className="bg-slate-900/35 border border-slate-800/80 p-5 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Deliveries done</span>
                  <p className="text-2xl font-extrabold text-indigo-400 mt-1">{earnings?.deliveryCount || 0}</p>
                </div>
                <div className="bg-slate-900/35 border border-slate-800/80 p-5 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tip Earnings</span>
                  <p className="text-2xl font-extrabold text-amber-400 mt-1">₹{earnings?.tipEarnings || 0}</p>
                </div>
                <div className={`p-5 rounded-2xl border ${(earnings?.cashInHand || 0) >= 2000
                    ? "bg-red-950/20 border-red-500/40 text-red-300 animate-pulse"
                    : "bg-slate-900/35 border-slate-800/80 text-slate-100"
                  }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Cash In Hand (COD)</span>
                  <p className={`text-2xl font-extrabold mt-1 ${(earnings?.cashInHand || 0) >= 2000 ? "text-red-400" : "text-emerald-400"
                    }`}>
                    ₹{earnings?.cashInHand || 0}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left side: Bank Payouts */}
                <div className="space-y-6">
                  {/* Request Payout Card */}
                  <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
                    <div>
                      <h3 className="font-bold text-white text-base">Request Payout</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Transfer your wallet earnings directly to your UPI ID or bank account.</p>
                    </div>
                    <button
                      onClick={() => {
                        setPayoutForm({
                          amount: walletBalance.toString(),
                          type: "upi",
                          upiId: "",
                          bankName: "",
                          accountNumber: "",
                          ifscCode: "",
                          holderName: "",
                        });
                        setIsPayoutModalOpen(true);
                      }}
                      disabled={payoutActionLoading || walletBalance <= 0}
                      className="w-full sm:w-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-600/10 cursor-pointer text-center"
                    >
                      {payoutActionLoading ? "Processing..." : "Request Payout"}
                    </button>
                    {payoutError && (
                      <p className="text-xs text-red-500 font-semibold">{payoutError}</p>
                    )}
                    {walletBalance <= 0 && (
                      <p className="text-[11px] text-slate-500">No balance available to withdraw at this time.</p>
                    )}
                  </div>

                  {/* Recent Payouts table */}
                  <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-base">Recent Withdrawals</h3>
                    </div>

                    {payoutsLoading ? (
                      <p className="text-xs text-slate-500">Loading payout records...</p>
                    ) : payouts.length === 0 ? (
                      <p className="text-xs text-slate-500">No payout records found.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {payouts.slice(0, 5).map((payout) => (
                          <div key={payout._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800/80 p-3.5 rounded-xl bg-slate-950/40">
                            <div>
                              <p className="font-bold text-sm text-white">₹{payout.amount}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Type: <span className="uppercase font-semibold text-slate-400">{payout.paymentDetails?.type}</span>
                                {payout.paymentDetails?.type === "upi" ? ` (${payout.paymentDetails.upiId})` : ` (${payout.paymentDetails?.bankName} - ${payout.paymentDetails?.accountNumber?.slice(-4)})`}
                              </p>
                              <p className="text-[9px] text-slate-500 mt-0.5">
                                Requested: {new Date(payout.createdAt).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${payout.status === "approved"
                                  ? "bg-green-950 text-green-400 border border-green-500/20"
                                  : payout.status === "rejected"
                                    ? "bg-red-950 text-red-400 border border-red-500/20"
                                    : "bg-amber-950 text-amber-400 border border-amber-500/20"
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

                {/* Right side: Cash in Hand Settlements */}
                <div className="space-y-6">
                  {/* Settle Cash Card */}
                  <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
                    <div>
                      <h3 className="font-bold text-white text-base">Settle Cash collected (COD)</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Deposit cash collected from Cash on Delivery orders to clear your limits.</p>
                    </div>
                    <button
                      onClick={() => {
                        setDepositForm({
                          amount: (earnings?.cashInHand || 0).toString(),
                          method: "upi",
                          transactionId: "",
                          storeId: depositStores[0]?._id || "",
                        });
                        setIsDepositModalOpen(true);
                      }}
                      disabled={(earnings?.cashInHand || 0) <= 0}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/10 cursor-pointer text-center"
                    >
                      Deposit / Settle Cash
                    </button>
                    {(earnings?.cashInHand || 0) <= 0 && (
                      <p className="text-[11px] text-slate-500">No cash in hand to settle right now.</p>
                    )}
                  </div>

                  {/* Cash Deposits Log */}
                  <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
                    <h3 className="font-bold text-white text-base">Cash Deposit History</h3>
                    {depositLoading ? (
                      <p className="text-xs text-slate-500">Loading deposits log...</p>
                    ) : deposits.length === 0 ? (
                      <p className="text-xs text-slate-500">No deposits registered yet.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {deposits.slice(0, 5).map((deposit) => (
                          <div key={deposit._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800/80 p-3.5 rounded-xl bg-slate-950/40">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm text-white">₹{deposit.amount}</p>
                                <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold uppercase">
                                  {deposit.method === "upi" ? "Online UPI" : "Store Handover"}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">
                                {deposit.method === "store_manager" ? `Store: ${deposit.storeId?.name || "Dark Store"}` : `Txn ID: ${deposit.transactionId || "N/A"}`}
                              </p>
                              <p className="text-[9px] text-slate-500/80">
                                {new Date(deposit.createdAt).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${deposit.status === "approved"
                                  ? "bg-green-950 text-green-400 border border-green-500/20"
                                  : deposit.status === "rejected"
                                    ? "bg-red-950 text-red-400 border border-red-500/20"
                                    : "bg-amber-950 text-amber-400 border border-amber-500/20"
                                }`}
                            >
                              {deposit.status === "pending" ? "Pending Manager Review" : deposit.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. Settings Tab */}
          {activeTab === "settings" && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
              <form onSubmit={handleUpdateProfile} className="space-y-6">

                {/* Profile Information */}
                <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
                  <h3 className="font-extrabold text-white text-base border-b border-slate-800 pb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-green-400" /> Rider Profile Info
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        required
                        value={settingsProfile.name}
                        onChange={(e) => setSettingsProfile({ ...settingsProfile, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        disabled
                        value={settingsProfile.email}
                        className="w-full bg-slate-950/60 border border-slate-800/50 rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</label>
                      <input
                        type="text"
                        required
                        value={settingsProfile.mobileNumber}
                        onChange={(e) => setSettingsProfile({ ...settingsProfile, mobileNumber: e.target.value.replace(/\D/g, "") })}
                        placeholder="e.g. 9876543210"
                        maxLength={10}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Vehicle Selection */}
                <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
                  <h3 className="font-extrabold text-white text-base border-b border-slate-800 pb-3 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-green-400" /> Vehicle Settings
                  </h3>

                  <p className="text-xs text-slate-400">Select your active vehicle type for order assignments.</p>

                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: "bicycle", label: "Bicycle", desc: "No fuel cost", icon: "🚴" },
                      { id: "e-cycle", label: "E-Cycle", desc: "Charge & ride", icon: "⚡🚴" },
                      { id: "motorcycle", label: "Motorcycle", desc: "Fastest delivery", icon: "🏍️" },
                    ].map((v) => {
                      const isSelected = settingsProfile.vehicleType === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSettingsProfile({ ...settingsProfile, vehicleType: v.id })}
                          className={`p-4 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 ${isSelected
                              ? "bg-green-500/10 border-green-500 text-white font-bold"
                              : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                        >
                          <span className="text-2xl">{v.icon}</span>
                          <div>
                            <p className="text-xs font-bold">{v.label}</p>
                            <p className="text-[9px] opacity-80 mt-0.5">{v.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Payout Details */}
                <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
                  <h3 className="font-extrabold text-white text-base border-b border-slate-800 pb-3 flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-green-400" /> Payout Configurations
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transfer Method</label>
                      <select
                        value={settingsProfile.payoutDetails.type}
                        onChange={(e) => setSettingsProfile({
                          ...settingsProfile,
                          payoutDetails: { ...settingsProfile.payoutDetails, type: e.target.value as any }
                        })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                      >
                        <option value="upi">UPI ID</option>
                        <option value="bank">Bank Account</option>
                      </select>
                    </div>

                    {settingsProfile.payoutDetails.type === "upi" ? (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">UPI ID</label>
                        <input
                          type="text"
                          required
                          value={settingsProfile.payoutDetails.upiId}
                          onChange={(e) => setSettingsProfile({
                            ...settingsProfile,
                            payoutDetails: { ...settingsProfile.payoutDetails, upiId: e.target.value }
                          })}
                          placeholder="e.g. mobile@upi"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bank Name</label>
                          <input
                            type="text"
                            required
                            value={settingsProfile.payoutDetails.bankName}
                            onChange={(e) => setSettingsProfile({
                              ...settingsProfile,
                              payoutDetails: { ...settingsProfile.payoutDetails, bankName: e.target.value }
                            })}
                            placeholder="e.g. HDFC Bank"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Number</label>
                          <input
                            type="text"
                            required
                            value={settingsProfile.payoutDetails.accountNumber}
                            onChange={(e) => setSettingsProfile({
                              ...settingsProfile,
                              payoutDetails: { ...settingsProfile.payoutDetails, accountNumber: e.target.value }
                            })}
                            placeholder="e.g. 50100234567890"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">IFSC Code</label>
                          <input
                            type="text"
                            required
                            value={settingsProfile.payoutDetails.ifscCode}
                            onChange={(e) => setSettingsProfile({
                              ...settingsProfile,
                              payoutDetails: { ...settingsProfile.payoutDetails, ifscCode: e.target.value }
                            })}
                            placeholder="e.g. HDFC0001234"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Holder Name</label>
                          <input
                            type="text"
                            required
                            value={settingsProfile.payoutDetails.holderName}
                            onChange={(e) => setSettingsProfile({
                              ...settingsProfile,
                              payoutDetails: { ...settingsProfile.payoutDetails, holderName: e.target.value }
                            })}
                            placeholder="e.g. Rahul Raj Modi"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={settingsLoading}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md shadow-green-600/10 disabled:opacity-50"
                  >
                    {settingsLoading ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </form>

              {/* Security & KYC Display */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
                <h3 className="font-extrabold text-white text-base border-b border-slate-800 pb-3 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-400" /> Operational KYC Status
                </h3>

                <div className="flex items-center gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                  {settingsProfile.kycStatus === "approved" ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center text-lg flex-shrink-0">✓</div>
                      <div>
                        <h4 className="font-bold text-white text-xs">KYC Verified & Approved</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Your DigiLocker secure integration is active. You have full logistical clearance.</p>
                      </div>
                    </>
                  ) : settingsProfile.kycStatus === "pending" ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg flex-shrink-0 animate-pulse">⌛</div>
                      <div>
                        <h4 className="font-bold text-amber-400 text-xs">Verification Under Review</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Your document uploads are currently being inspected by compliance administrators.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-lg flex-shrink-0">⚠</div>
                      <div>
                        <h4 className="font-bold text-red-400 text-xs">KYC Verification Missing</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Please complete identity verification to unlock full online logistics console access.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Role Switcher */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
                <h3 className="font-extrabold text-white text-base border-b border-slate-800 pb-3 flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-indigo-400" /> Switch Operational Console
                </h3>
                <p className="text-xs text-slate-400">
                  Switch back to your customer account profile dashboard to shop groceries, view home screens, and manage personal settings.
                </p>
                <button
                  type="button"
                  onClick={handleSwitchToShopper}
                  disabled={settingsLoading}
                  className="px-5 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeftRight className="w-4 h-4" /> Switch to Shopper Console
                </button>
              </div>

            </div>
          )}
        </div>
      </main>

      {/* Cash Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsDepositModalOpen(false)}
          />
          {/* Modal Content */}
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scaleUp z-10">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-base">Settle Collected Cash</h3>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {depositSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mx-auto text-xl">✓</div>
                <h4 className="font-bold text-white text-sm">Settlement Submitted!</h4>
                <p className="text-xs text-slate-400">
                  {depositForm.method === "upi"
                    ? "Online transfer approved and cash limit cleared."
                    : "Handover request submitted. Pending store manager approval."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitDeposit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Amount to Deposit (INR)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={earnings?.cashInHand || 0}
                    value={depositForm.amount}
                    onChange={(e) =>
                      setDepositForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="Enter amount"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Max settleable: ₹{earnings?.cashInHand || 0}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Settlement Method
                  </label>
                  <select
                    value={depositForm.method}
                    onChange={(e) =>
                      setDepositForm((prev) => ({
                        ...prev,
                        method: e.target.value as any,
                        storeId: e.target.value === "store_manager" ? (depositStores[0]?._id || "") : "",
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="upi">Online UPI Transfer (Instant Settlement)</option>
                    <option value="store_manager">Store Manager Handover (Offline Cash)</option>
                  </select>
                </div>

                {depositForm.method === "upi" && (
                  <div className="space-y-3 bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Scan the company QR code or pay to <strong>pay@snapcart</strong>. Enter UPI Ref No / Transaction ID below:
                    </p>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                        Transaction ID / Ref No
                      </label>
                      <input
                        type="text"
                        required
                        value={depositForm.transactionId}
                        onChange={(e) =>
                          setDepositForm((prev) => ({ ...prev, transactionId: e.target.value }))
                        }
                        placeholder="e.g. UPI1234567890"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                )}

                {depositForm.method === "store_manager" && (
                  <div className="space-y-3 bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                        Select Dark Store
                      </label>
                      <select
                        required
                        value={depositForm.storeId}
                        onChange={(e) =>
                          setDepositForm((prev) => ({ ...prev, storeId: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                      >
                        {depositStores.map((st) => (
                          <option key={st._id} value={st._id}>
                            {st.name} ({st.location?.address || "N/A"})
                          </option>
                        ))}
                        {depositStores.length === 0 && (
                          <option value="">No stores active</option>
                        )}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                        Handover Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={depositForm.transactionId}
                        onChange={(e) =>
                          setDepositForm((prev) => ({ ...prev, transactionId: e.target.value }))
                        }
                        placeholder="e.g. Receipt No or cash denominations"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {depositError && (
                  <p className="text-xs text-red-500 font-semibold">{depositError}</p>
                )}

                <div className="flex gap-3 pt-3 border-t border-slate-800/80">
                  <button
                    type="submit"
                    disabled={depositLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {depositLoading ? "Submitting..." : "Confirm Deposit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDepositModalOpen(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Payout Request Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsPayoutModalOpen(false)}
          />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scaleUp z-10">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-base">Request Payout</h3>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Amount to Settle (INR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={walletBalance}
                  value={payoutForm.amount}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  placeholder="Enter amount"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                />
                <p className="text-[10px] text-slate-500">
                  Available Wallet Balance: ₹{walletBalance.toFixed(2)}
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Transfer Mode
                </label>
                <select
                  value={payoutForm.type}
                  onChange={(e) =>
                    setPayoutForm((prev) => ({
                      ...prev,
                      type: e.target.value as any,
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                >
                  <option value="upi">UPI ID</option>
                  <option value="bank">Bank Account</option>
                </select>
              </div>

              {payoutForm.type === "upi" ? (
                <div className="space-y-3 bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                      UPI ID
                    </label>
                    <input
                      type="text"
                      required
                      value={payoutForm.upiId}
                      onChange={(e) =>
                        setPayoutForm((prev) => ({ ...prev, upiId: e.target.value }))
                      }
                      placeholder="e.g. mobile-number@upi"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      required
                      value={payoutForm.bankName}
                      onChange={(e) =>
                        setPayoutForm((prev) => ({ ...prev, bankName: e.target.value }))
                      }
                      placeholder="e.g. HDFC Bank"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                      Account Number
                    </label>
                    <input
                      type="text"
                      required
                      value={payoutForm.accountNumber}
                      onChange={(e) =>
                        setPayoutForm((prev) => ({ ...prev, accountNumber: e.target.value }))
                      }
                      placeholder="e.g. 50100234567890"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      required
                      value={payoutForm.ifscCode}
                      onChange={(e) =>
                        setPayoutForm((prev) => ({ ...prev, ifscCode: e.target.value }))
                      }
                      placeholder="e.g. HDFC0001234"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      required
                      value={payoutForm.holderName}
                      onChange={(e) =>
                        setPayoutForm((prev) => ({ ...prev, holderName: e.target.value }))
                      }
                      placeholder="e.g. Rahul Raj Modi"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              )}

              {payoutError && (
                <p className="text-xs text-red-500 font-semibold">{payoutError}</p>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="submit"
                  disabled={payoutActionLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {payoutActionLoading ? "Submitting..." : "Submit Payout Request"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Available order ticking countdown component
const AssignmentCountdown = ({
  expiresAt,
  createdAt,
  onExpired
}: {
  expiresAt: any;
  createdAt?: any;
  onExpired?: () => void;
}) => {
  const [percent, setPercent] = useState(100);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const expiry = new Date(expiresAt).getTime();
    const created = createdAt ? new Date(createdAt).getTime() : expiry - 60000;
    const total = expiry - created > 0 ? expiry - created : 60000;

    const update = () => {
      const now = Date.now();
      const left = expiry - now;
      if (left <= 0) {
        setPercent(0);
        setSecondsLeft(0);
        if (onExpired) onExpired();
        return false;
      }
      setPercent(Math.max(0, Math.min(100, (left / total) * 100)));
      setSecondsLeft(Math.ceil(left / 1000));
      return true;
    };

    update();
    const interval = setInterval(() => {
      const active = update();
      if (!active) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, [expiresAt, createdAt]);

  if (secondsLeft <= 0) return null;

  return (
    <div className="space-y-1 mt-3">
      <div className="flex justify-between text-[10px] font-bold text-slate-400">
        <span>Acceptance Window</span>
        <span className="text-red-400 font-extrabold">{secondsLeft}s left</span>
      </div>
      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${percent < 25 ? "bg-red-500 animate-pulse" : percent < 50 ? "bg-amber-500" : "bg-green-500"
            }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

// Premium circular target gauge for daily incentives
const IncentiveGauge = ({
  progress,
  title,
  reward,
  description,
  targetDeliveries,
  deliveriesDone,
  targetEarnings,
  earningsDone,
  endAt
}: {
  progress: number;
  title: string;
  reward: number;
  description?: string;
  targetDeliveries?: number;
  deliveriesDone?: number;
  targetEarnings?: number;
  earningsDone?: number;
  endAt?: string;
}) => {
  const radius = 35;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-5 shadow-lg relative overflow-hidden">
      <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-slate-800 fill-transparent"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-green-500 fill-transparent transition-all duration-500 ease-out"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold text-white">{progress}%</span>
          <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Done</span>
        </div>
      </div>
      <div className="flex-1 space-y-2 w-full">
        <div>
          <span className="text-[9px] text-green-400 font-extrabold uppercase tracking-wider">Daily Milestone Target</span>
          <h4 className="font-bold text-white text-sm line-clamp-1">{title}</h4>
          {description && <p className="text-[10px] text-slate-400 mt-0.5">{description}</p>}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-slate-400">
          {targetDeliveries ? (
            <span>
              Deliveries: <strong className="text-white">{deliveriesDone}</strong>/{targetDeliveries}
            </span>
          ) : null}
          {targetEarnings ? (
            <span>
              Earnings: <strong className="text-white">₹{earningsDone}</strong>/{targetEarnings}
            </span>
          ) : null}
          {endAt && (
            <span className="text-slate-500 font-medium">
              ⏳ Ends: {new Date(endAt).toLocaleString("en-IN")}
            </span>
          )}
        </div>

        <p className="text-[10px] text-slate-300">
          Complete milestone for <strong className="text-green-400">₹{reward}</strong> bonus.
        </p>
      </div>
    </div>
  );
};

function Loader2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default DeliveryBoyDashboard;