"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Payout {
  _id: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  period: {
    startDate: string;
    endDate: string;
  };
  createdAt: string;
  transactionId?: string;
  failureReason?: string;
}

interface EarningsSummary {
  pendingPayout: number;
  totalEarnings: number;
  currentSessionEarnings: number;
  deliveryCount: number;
  tipEarnings: number;
}

export default function DeliveryBoyPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payoutRes, earningsRes] = await Promise.all([
        fetch("/api/delivery-boy/payouts"),
        fetch("/api/delivery-boy/earnings"),
      ]);
      const payoutData = await payoutRes.json();
      const earningsData = await earningsRes.json();
      if (payoutRes.ok) {
        setPayouts(payoutData.payouts || []);
      }
      if (earningsRes.ok) {
        setEarnings(earningsData.summary || null);
      }
    } catch (err) {
      console.error("Failed to load payouts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestPayout = async () => {
    try {
      setError(null);
      setRequesting(true);
      const res = await fetch("/api/delivery-boy/payouts", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to request payout");
        return;
      }
      await fetchData();
    } catch (err) {
      console.error("Failed to request payout", err);
      setError("Failed to request payout");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payouts</h1>
            <p className="text-gray-600">Track your payout requests and history.</p>
          </div>
          <Link
            href="/delivery-boy"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-sm text-gray-600">Pending Payout</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              ₹{earnings?.pendingPayout || 0}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ₹{earnings?.totalEarnings || 0}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Request Payout</p>
              <p className="text-xs text-gray-500 mt-1">Moves pending balance to payout request.</p>
            </div>
            <button
              onClick={handleRequestPayout}
              disabled={requesting || (earnings?.pendingPayout || 0) <= 0}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {requesting ? "Requesting..." : "Request"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-lg font-semibold text-gray-900">Recent Payouts</h2>
          {loading ? (
            <p className="text-gray-600 mt-4">Loading payouts...</p>
          ) : payouts.length === 0 ? (
            <p className="text-gray-600 mt-4">No payouts found.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {payouts.map((payout) => (
                <div
                  key={payout._id}
                  className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold">₹{payout.amount}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(payout.period.startDate).toLocaleDateString("en-IN")} - {new Date(payout.period.endDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
                    Requested: {new Date(payout.createdAt).toLocaleDateString("en-IN")}
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
    </div>
  );
}
