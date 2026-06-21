"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  Building,
  Info,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

interface IWithdrawal {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    mobileNumber: string;
    role: string;
  };
  amount: number;
  paymentDetails: {
    type: "upi" | "bank";
    upiId?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    holderName?: string;
  };
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPayoutsDashboard() {
  const [withdrawals, setWithdrawals] = useState<IWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  
  // Modal state
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<IWithdrawal | null>(null);
  const [actionType, setActionType] = useState<"approved" | "rejected" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/payouts");
      const data = await res.json();
      if (data.success) {
        setWithdrawals(data.withdrawals || []);
      }
    } catch (error) {
      console.error("Failed to fetch withdrawals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWithdrawal || !actionType) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/payouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          withdrawalId: selectedWithdrawal._id,
          status: actionType,
          adminNote: adminNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Update local state directly
        setWithdrawals((prev) =>
          prev.map((w) =>
            w._id === selectedWithdrawal._id
              ? { ...w, status: actionType, adminNote: adminNote.trim() || undefined }
              : w
          )
        );
        setSelectedWithdrawal(null);
        setActionType(null);
        setAdminNote("");
        alert(`Payout request successfully ${actionType}!`);
      } else {
        alert(data.message || "Failed to process payout request");
      }
    } catch (error) {
      console.error("Action error:", error);
      alert("An error occurred while processing the request.");
    } finally {
      setActionLoading(false);
    }
  };

  // Client-side calculations for stats
  const stats = React.useMemo(() => {
    let pendingAmt = 0;
    let pendingCount = 0;
    let approvedAmt = 0;
    let rejectedAmt = 0;

    withdrawals.forEach((w) => {
      if (w.status === "pending") {
        pendingAmt += w.amount;
        pendingCount++;
      } else if (w.status === "approved") {
        approvedAmt += w.amount;
      } else if (w.status === "rejected") {
        rejectedAmt += w.amount;
      }
    });

    return { pendingAmt, pendingCount, approvedAmt, rejectedAmt };
  }, [withdrawals]);

  // Client-side search and status filtering
  const filteredWithdrawals = React.useMemo(() => {
    return withdrawals.filter((w) => {
      const matchesStatus = statusFilter === "all" || w.status === statusFilter;
      
      const riderName = w.userId?.name?.toLowerCase() || "";
      const riderEmail = w.userId?.email?.toLowerCase() || "";
      const riderMobile = w.userId?.mobileNumber || "";
      const searchQuery = search.toLowerCase();
      
      const matchesSearch = 
        riderName.includes(searchQuery) ||
        riderEmail.includes(searchQuery) ||
        riderMobile.includes(searchQuery);

      return matchesStatus && matchesSearch;
    });
  }, [withdrawals, statusFilter, search]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Header Panel */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/admin/orders" 
              className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Logistics Payouts
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage rider wallet withdrawals & payments</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Payouts</span>
              <h3 className="text-2xl font-black text-slate-800 mt-1">₹{stats.pendingAmt.toFixed(2)}</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{stats.pendingCount} requests waiting</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Clock className="w-5.5 h-5.5" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Approved</span>
              <h3 className="text-2xl font-black text-green-600 mt-1">₹{stats.approvedAmt.toFixed(2)}</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Cleared to bank accounts</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-5.5 h-5.5" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Rejected</span>
              <h3 className="text-2xl font-black text-rose-600 mt-1">₹{stats.rejectedAmt.toFixed(2)}</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Refunded to rider wallets</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-5.5 h-5.5" />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Requests</span>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{withdrawals.length}</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">All-time lifetime payouts log</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center">
              <CreditCard className="w-5.5 h-5.5" />
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white border border-slate-150 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex border-b md:border-b-0 border-slate-100 pb-2 md:pb-0 overflow-x-auto scrollbar-hide gap-1">
            {["all", "pending", "approved", "rejected"].map((tab) => {
              const isActive = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`py-2 px-4 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {tab === "all" ? "All requests" : tab}
                </button>
              );
            })}
          </div>

          <div className="relative max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or mobile..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-slate-400 transition"
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 text-center text-xs font-semibold text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading payout withdrawals log...</span>
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="p-16 text-center text-xs font-bold text-slate-400 flex flex-col items-center justify-center gap-2">
              <AlertCircle className="w-8 h-8 text-slate-300" />
              <span>No payout requests found matching filters.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Request Date</th>
                    <th className="px-6 py-4">Rider Details</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Transfer Option</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredWithdrawals.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-extrabold text-slate-800">{item.userId?.name || "Unknown Rider"}</span>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-300" /> {item.userId?.email || "N/A"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-300" /> {item.userId?.mobileNumber || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-black text-slate-800 text-sm">₹{item.amount.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4">
                        {item.paymentDetails?.type === "upi" ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 uppercase flex items-center gap-1">
                              <CreditCard className="w-3.5 h-3.5 text-blue-500" /> UPI
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">{item.paymentDetails.upiId}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-700 uppercase flex items-center gap-1">
                              <Building className="w-3.5 h-3.5 text-indigo-500" /> Bank Transfer
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">{item.paymentDetails?.bankName}</span>
                            <span className="text-[9px] text-slate-400 font-medium">A/C: {item.paymentDetails?.accountNumber}</span>
                            <span className="text-[9px] text-slate-400 font-medium">IFSC: {item.paymentDetails?.ifscCode}</span>
                            <span className="text-[9px] text-slate-400 font-medium">Holder: {item.paymentDetails?.holderName}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider inline-block text-center border w-24 ${
                            item.status === "approved"
                              ? "bg-green-50 text-green-700 border-green-100"
                              : item.status === "rejected"
                                ? "bg-rose-50 text-rose-700 border-rose-100"
                                : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}>
                            {item.status}
                          </span>
                          {item.adminNote && (
                            <span className="text-[9px] text-slate-400 italic font-medium max-w-[150px] truncate" title={item.adminNote}>
                              Note: {item.adminNote}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {item.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedWithdrawal(item);
                                setActionType("approved");
                                setAdminNote("");
                              }}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-[11px] transition shadow-md shadow-green-600/10 cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedWithdrawal(item);
                                setActionType("rejected");
                                setAdminNote("");
                              }}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[11px] transition shadow-md shadow-rose-600/10 cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Action Drawer Modal */}
      {selectedWithdrawal && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => {
              setSelectedWithdrawal(null);
              setActionType(null);
            }}
          />
          <div className="relative bg-white border border-slate-100 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 z-10 text-left">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 text-base capitalize flex items-center gap-1.5">
                {actionType === "approved" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                {actionType} Payout Request
              </h3>
              <button
                onClick={() => {
                  setSelectedWithdrawal(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-slate-800 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2">
              <p className="text-xs text-slate-500 font-medium">Please verify payout request details:</p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Rider:</span>
                  <span className="font-bold text-slate-700">{selectedWithdrawal.userId?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="font-black text-slate-700 text-sm">₹{selectedWithdrawal.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Option:</span>
                  <span className="font-bold text-slate-700 uppercase">{selectedWithdrawal.paymentDetails?.type}</span>
                </div>
                {selectedWithdrawal.paymentDetails?.type === "upi" ? (
                  <div className="flex justify-between">
                    <span className="text-slate-400">UPI ID:</span>
                    <span className="font-bold text-slate-700">{selectedWithdrawal.paymentDetails.upiId}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bank:</span>
                      <span className="font-bold text-slate-700">{selectedWithdrawal.paymentDetails?.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">A/C:</span>
                      <span className="font-bold text-slate-700">{selectedWithdrawal.paymentDetails?.accountNumber}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <form onSubmit={handleProcessRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Admin Note / Reference Transaction ID
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={
                    actionType === "approved"
                      ? "Enter bank reference / transaction ID (optional)"
                      : "Enter reason for rejection (optional)"
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-slate-400 transition outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`flex-grow font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-50 text-white cursor-pointer ${
                    actionType === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {actionLoading ? "Processing..." : `Confirm ${actionType}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWithdrawal(null);
                    setActionType(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
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
}
