"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  Plus,
  Search,
  Filter,
  Calendar,
  Lock,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  IndianRupee,
  RefreshCw,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminGiftCardsPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/login?redirect=/admin/gift-cards");
    },
  });
  const router = useRouter();

  // Gift card state
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number>(250);
  const [count, setCount] = useState<number>(1);
  const [customExpiry, setCustomExpiry] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "generate">("list");

  useEffect(() => {
    if (status === "loading") return;
    const isAdmin = session?.user?.currentRole === "admin";
    if (!isAdmin) {
      router.push("/unauthorized");
    } else {
      fetchGiftCards();
    }
  }, [session, status, router]);

  const fetchGiftCards = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/admin/gift-cards");
      if (res.data.success) {
        setGiftCards(res.data.giftCards || []);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch gift cards");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 10) {
      toast.error("Minimum amount is ₹10");
      return;
    }
    if (count < 1 || count > 100) {
      toast.error("You can generate between 1 and 100 cards");
      return;
    }

    try {
      setGenerating(true);
      const payload: any = {
        amount,
        count,
      };
      if (customExpiry) {
        payload.expiresAt = new Date(customExpiry).toISOString();
      }

      const res = await axios.post("/api/admin/gift-cards", payload);
      if (res.data.success) {
        toast.success(res.data.message || `Successfully generated ${count} gift card(s)!`);
        fetchGiftCards();
        setCount(1);
        setCustomExpiry("");
        setActiveTab("list");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to generate gift cards");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (card: any) => {
    const formattedCode = card.code.match(/.{1,4}/g)?.join(" ") || card.code;
    const textToCopy = `Gift Card Code: ${formattedCode}\nPIN: ${card.pin}\nAmount: ₹${card.amount}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(card._id);
    toast.success("Card details copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (status === "loading" || session?.user?.currentRole !== "admin") {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate client side stats
  const totalCards = giftCards.length;
  const activeCards = giftCards.filter((c) => c.status === "active" && new Date(c.expiresAt) > new Date()).length;
  const redeemedCards = giftCards.filter((c) => c.status === "redeemed").length;
  const expiredCards = giftCards.filter((c) => c.status === "expired" || (c.status === "active" && new Date() > new Date(c.expiresAt))).length;
  const totalRedeemedValue = giftCards.reduce((sum, c) => (c.status === "redeemed" ? sum + c.amount : sum), 0);
  const activeValue = giftCards.reduce((sum, c) => (c.status === "active" && new Date(c.expiresAt) > new Date() ? sum + c.amount : sum), 0);

  // Filter gift cards
  const filteredCards = giftCards.filter((card) => {
    const formattedCode = card.code.match(/.{1,4}/g)?.join(" ") || card.code;
    const codeMatches =
      card.code.toLowerCase().includes(searchQuery.replace(/[\s-]/g, "").toLowerCase()) ||
      formattedCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status normalization
    const isExpired = card.status === "active" && new Date() > new Date(card.expiresAt);
    const normalizedStatus = isExpired ? "expired" : card.status;

    const statusMatches = statusFilter === "all" || normalizedStatus === statusFilter;
    return codeMatches && statusMatches;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Ticket className="w-8 h-8 text-green-600" /> Gift Cards Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate gift cards for campaigns, promotions, or support adjustments, and monitor redemptions.
          </p>
        </div>
        <button
          onClick={fetchGiftCards}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition px-3.5 py-2 rounded-xl shadow-sm cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Database
        </button>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Generated</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{totalCards}</p>
            <p className="text-[10px] text-gray-400 mt-1">Inventory log count</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
            <Ticket className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Inventory</p>
            <p className="text-2xl font-black text-green-600 mt-1">{activeCards}</p>
            <p className="text-[10px] text-gray-400 mt-1">₹{activeValue.toLocaleString("en-IN")} total value</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Redeemed Cards</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{redeemedCards}</p>
            <p className="text-[10px] text-gray-400 mt-1">₹{totalRedeemedValue.toLocaleString("en-IN")} credited</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Expired Cards</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{expiredCards}</p>
            <p className="text-[10px] text-gray-400 mt-1">Unredeemed card loss</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-gray-150 pb-px">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "list"
              ? "border-green-600 text-green-600 font-extrabold"
              : "border-transparent text-gray-500 hover:text-gray-850"
          }`}
        >
          <Ticket className="w-4.5 h-4.5" />
          Gift Cards Inventory
        </button>
        <button
          onClick={() => setActiveTab("generate")}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "generate"
              ? "border-green-600 text-green-600 font-extrabold"
              : "border-transparent text-gray-500 hover:text-gray-855"
          }`}
        >
          <Plus className="w-4.5 h-4.5" />
          Generate New Cards
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === "generate" ? (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm max-w-xl mx-auto w-full">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-green-600" /> Generate New Cards
          </h2>

          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Predefined Amounts */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Predefined Amount</label>
              <div className="grid grid-cols-5 gap-2">
                {[100, 250, 500, 1000, 2000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      amount === val
                        ? "bg-green-600 text-white border-green-600 shadow-sm shadow-green-600/10"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Value (₹)</label>
              <div className="relative">
                <input
                  type="number"
                  min={10}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Enter custom card amount"
                  className="w-full text-sm font-semibold bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-green-500 focus:bg-white transition"
                  required
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Quantity Count */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quantity to Generate</label>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                placeholder="1"
                className="w-full text-sm font-semibold bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-500 focus:bg-white transition"
                required
              />
              <span className="text-[9px] text-gray-400">Generates up to 100 cards in bulk.</span>
            </div>

            {/* Expiry Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Expiration Date (Optional)</label>
              <div className="relative">
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  className="w-full text-sm font-semibold bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-green-500 focus:bg-white transition appearance-none"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <span className="text-[9px] text-gray-400">Defaults to 1 year from generation if left blank.</span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={generating || amount < 10 || count < 1}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating Cards...
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4" />
                  Generate Gift Card(s)
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col w-full">
          {/* Search & Filters */}
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by card code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-green-500 focus:bg-white transition"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-4 h-4" />
              </div>
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 outline-none focus:border-green-500 focus:bg-white transition appearance-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="redeemed">Redeemed</option>
                <option value="expired">Expired</option>
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Filter className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">Loading inventory log...</span>
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center p-4">
                <Ticket className="w-12 h-12 text-slate-200 mb-2" />
                <h3 className="text-sm font-extrabold text-slate-800">No Gift Cards Found</h3>
                <p className="text-xs mt-1 text-slate-400">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting filters or clear search query."
                    : "No cards generated yet. Switch to 'Generate New Cards' to start."}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-100 text-left border-collapse">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3.5">Card Code & PIN</th>
                    <th className="px-5 py-3.5 text-right">Amount</th>
                    <th className="px-5 py-3.5">Redeemed By</th>
                    <th className="px-5 py-3.5">Expires At</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700 bg-white">
                  {filteredCards.map((card) => {
                    const formattedCode = card.code.match(/.{1,4}/g)?.join(" ") || card.code;
                    const isExpired = card.status === "active" && new Date() > new Date(card.expiresAt);
                    const isRedeemed = card.status === "redeemed";

                    return (
                      <tr key={card._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-extrabold font-mono text-gray-900 tracking-wider">
                              {formattedCode}
                            </span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                              <Lock className="w-2.5 h-2.5" /> PIN: {card.pin}
                            </span>
                            {card.purchasedBy && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 w-fit mt-1">
                                👤 Bought by {card.purchasedBy.name || card.purchasedBy.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-black text-gray-900">
                          ₹{card.amount}
                        </td>
                        <td className="px-5 py-3.5">
                          {isRedeemed && card.redeemedBy ? (
                            <div className="flex flex-col">
                              <span className="font-extrabold text-gray-800">{card.redeemedBy.name}</span>
                              <span className="text-[9px] text-gray-400">{card.redeemedBy.email}</span>
                            </div>
                          ) : (
                            <span className="text-gray-300 font-bold">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 font-medium">
                          {new Date(card.expiresAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          {isRedeemed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 rounded-full border border-blue-100">
                              <Check className="w-3 h-3" /> Redeemed
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 rounded-full border border-rose-100">
                              <AlertCircle className="w-3 h-3" /> Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold text-green-700 bg-green-50 rounded-full border border-green-100">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleCopy(card)}
                            disabled={isRedeemed || isExpired || card.isUserPurchased}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              copiedId === card._id
                                ? "bg-green-50 border-green-200 text-green-600"
                                : "bg-white border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-800"
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                            title={card.isUserPurchased ? "User-purchased cards cannot be copied" : "Copy Code & PIN"}
                          >
                            {copiedId === card._id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
