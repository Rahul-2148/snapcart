// src/app/user/account/gold/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { useSession } from "next-auth/react";
import axios from "axios";
import {
  Crown,
  Check,
  Loader2,
  Calendar,
  Sparkles,
  RefreshCw,
  XCircle,
  Clock,
  IndianRupee,
  ChevronRight,
  TrendingDown,
  Truck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { setUserData } from "@/redux/features/userSlice";
import { setCart } from "@/redux/features/cartSlice";
import useGetMe from "@/hooks/useGetMe";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface IGoldTransaction {
  _id: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  referenceId?: string;
}

export default function GoldMembershipSettingsPage() {
  const { data: session } = useSession();
  useGetMe();
  const { userData } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch<AppDispatch>();

  const [loading, setLoading] = useState(true);
  const [updatingAutoRenew, setUpdatingAutoRenew] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [transactions, setTransactions] = useState<IGoldTransaction[]>([]);

  // Load Razorpay Checkout SDK script on mount
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      try {
        document.body.removeChild(script);
      } catch (err) {
        // ignore if already removed
      }
    };
  }, []);

  // Fetch transaction history
  const fetchGoldTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/user/gold/transactions");
      if (res.data.success) {
        setTransactions(res.data.transactions || []);
      }
    } catch (error: any) {
      console.error("Error fetching gold transactions:", error);
      toast.error("Failed to load payment history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userData?._id) {
      fetchGoldTransactions();
    }
  }, [userData?._id, fetchGoldTransactions]);

  // Toggle Auto-Renewal status
  const handleToggleAutoRenew = async () => {
    if (!userData) return;
    const currentStatus = userData.goldAutoRenew !== false; // Default is true
    const newStatus = !currentStatus;

    setUpdatingAutoRenew(true);
    try {
      const res = await axios.post("/api/user/gold/auto-renew", {
        autoRenew: newStatus,
      });

      if (res.data.success) {
        dispatch(
          setUserData({
            ...userData,
            goldAutoRenew: newStatus,
          })
        );
        toast.success(res.data.message || `Auto-renewal turned ${newStatus ? "ON" : "OFF"}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update auto-renewal preferences");
    } finally {
      setUpdatingAutoRenew(false);
    }
  };

  // Trigger Razorpay flow to subscribe/extend
  const handleSubscribeGold = async () => {
    if (!window.Razorpay) {
      toast.error("Payment gateway is loading. Please try again in a moment.");
      return;
    }

    setSubmittingPayment(true);
    try {
      const { data } = await axios.post("/api/user/gold/subscribe");

      if (!data.success || !data.razorpayOrderId) {
        if (data.isGoldMember) {
          dispatch(setCart({ isGoldMember: true, items: [] }));
          window.dispatchEvent(new CustomEvent("snapcart-cart-refresh"));
          toast.success(data.message || "You are already a Gold member!");
          setSubmittingPayment(false);
          return;
        }
        throw new Error(data.message || "Failed to create payment order");
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Snapcart Gold",
        description: "Gold Membership — 1 Month (₹49)",
        order_id: data.razorpayOrderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await axios.post("/api/user/gold/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data?.success) {
              dispatch(setCart({ isGoldMember: true, items: [] }));
              window.dispatchEvent(new CustomEvent("snapcart-cart-refresh"));
              
              // Update user data locally
              if (userData) {
                dispatch(
                  setUserData({
                    ...userData,
                    isGoldMember: true,
                    goldExpiryDate: verifyRes.data.goldExpiryDate,
                  })
                );
              }
              
              fetchGoldTransactions();
              toast.success("Welcome/Renewed to Snapcart Gold! 👑🎉");
            } else {
              throw new Error(verifyRes.data?.message || "Verification failed");
            }
          } catch (err: any) {
            toast.error(err.response?.data?.message || "Payment verification failed.");
          } finally {
            setSubmittingPayment(false);
          }
        },
        prefill: {
          name: userData?.name || "",
          email: userData?.email || "",
          contact: userData?.mobileNumber || "",
        },
        theme: { color: "#D97706" },
        modal: {
          ondismiss: () => {
            setSubmittingPayment(false);
            toast.info("Payment cancelled.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setSubmittingPayment(false);
        toast.error("Payment failed: " + (response.error?.description || "Unknown error"));
      });
      rzp.open();
      setSubmittingPayment(false);
    } catch (error: any) {
      setSubmittingPayment(false);
      toast.error(error.response?.data?.message || error.message || "Failed to initiate payment");
    }
  };

  // Helper: Format Expiry Date
  const formatExpiryDate = (dateString?: string | Date) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Helper: Compute Remaining Days
  const getDaysRemaining = (expiryDateString?: string | Date) => {
    if (!expiryDateString) return 0;
    const expiry = new Date(expiryDateString);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isGold = userData?.isGoldMember === true;
  const expiryDate = userData?.goldExpiryDate;
  const daysRemaining = getDaysRemaining(expiryDate);
  const isAutoRenewActive = userData?.goldAutoRenew !== false; // Default true

  return (
    <div className="bg-slate-50 min-h-screen py-2 sm:py-6 px-1 sm:px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Gold Status Card */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-yellow-500/20 text-white shadow-2xl p-6 sm:p-8">
          {/* Decorative glows */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-yellow-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-yellow-500/20 animate-pulse">
                <Crown className="w-8 h-8 text-slate-900" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-100">
                    Snapcart Gold
                  </h1>
                  {isGold ? (
                    <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                      Active
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-400 border border-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                      Inactive
                    </span>
                  )}
                </div>
                {isGold ? (
                  <p className="text-slate-300 text-sm mt-1">
                    Your membership is active with full premium benefits.
                  </p>
                ) : (
                  <p className="text-slate-400 text-sm mt-1">
                    Subscribe now to save up to ₹1,500 every month on groceries.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {isGold && (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-center sm:text-left">
                  <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Expiry Date
                  </p>
                  <p className="text-sm font-bold text-slate-100 mt-0.5">
                    {formatExpiryDate(expiryDate)}
                  </p>
                  <p className="text-[10px] text-amber-400 font-semibold mt-0.5">
                    {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubscribeGold}
                disabled={submittingPayment}
                className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-600 hover:to-amber-600 text-slate-950 font-extrabold py-3.5 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10 hover:shadow-yellow-500/25 active:scale-98 disabled:opacity-50 cursor-pointer text-sm"
              >
                {submittingPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isGold ? "Extend / Renew Membership" : "Join Snapcart Gold — ₹49"}
              </button>
            </div>
          </div>
        </div>

        {/* Settings and Settings controls */}
        {isGold && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              ⚙️ Manage Subscription
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Auto Renewal Toggle */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">Auto-Renewal Mode</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Automatically charge ₹49 from your Snapcart wallet or primary card on expiry to avoid premium benefit service interruptions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleAutoRenew}
                  disabled={updatingAutoRenew}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAutoRenewActive ? "bg-amber-500" : "bg-gray-200"
                  } ${updatingAutoRenew ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isAutoRenewActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Status information panel */}
              <div className="flex flex-col justify-between p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Subscription Plan Details
                  </p>
                  <p className="text-xs text-amber-800/80 leading-relaxed">
                    Your Snapcart Gold subscription charges ₹49 per month. You are protected by our satisfaction guarantee. If Auto-Renew is turned off, benefits will expire immediately on the expiry date.
                  </p>
                </div>

                <div className="mt-3 text-xs font-semibold text-amber-950">
                  Status: {isAutoRenewActive ? "Renewing automatically" : "Expiring manually"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Grid */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            👑 Exclusive Gold Benefits
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-50/50 to-amber-50/10 border border-amber-100/50">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <Truck className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-800">Free Delivery</p>
              <p className="text-xs text-slate-500 mt-1 leading-normal">
                Enjoy absolutely free delivery on all orders above ₹99. No coupon required.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-50/50 to-amber-50/10 border border-amber-100/50">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <TrendingDown className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-800">10% Off Fresh Items</p>
              <p className="text-xs text-slate-500 mt-1 leading-normal">
                Extra 10% flat discount on all fresh vegetables and fruits.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-50/50 to-amber-50/10 border border-amber-100/50">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-800">5% Extra Discount</p>
              <p className="text-xs text-slate-500 mt-1 leading-normal">
                Extra 5% discount on all groceries storewide, automatically applied.
              </p>
            </div>
          </div>
        </div>

        {/* Transaction History Section */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            🧾 Gold Billing History
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm text-slate-500">Loading your payment history...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
              <p className="text-sm text-slate-500">No previous Gold transactions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Billing Date</th>
                    <th className="pb-3 px-4">Description</th>
                    <th className="pb-3 px-4">Amount</th>
                    <th className="pb-3 pl-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 pr-4 text-xs font-medium text-slate-500">
                        {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        {tx.description}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900">
                        ₹{tx.amount.toFixed(2)}
                      </td>
                      <td className="py-4 pl-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            tx.status === "completed"
                              ? "bg-green-50 text-green-700"
                              : tx.status === "pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
