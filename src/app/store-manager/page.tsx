// src/app/store-manager/page.tsx
"use client";

import { useEffect, useState } from "react";
import { 
  Building2, 
  Clock, 
  MapPin, 
  Phone, 
  AlertCircle, 
  Boxes, 
  ClipboardList, 
  Loader2,
  CheckCircle,
  Activity,
  Save,
  User
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

interface IStore {
  _id: string;
  name: string;
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: [number, number];
  };
  serviceRadiusKm: number;
  openingHours: {
    open: string;
    close: string;
  };
  status: "active" | "inactive" | "maintenance";
  contactPhone?: string;
}

interface IMetrics {
  pendingOrdersCount: number;
  outOfStockCount: number;
  totalVariantsCount: number;
  activeStaffCount: number;
}

export default function StoreManagerDashboard() {
  const [store, setStore] = useState<IStore | null>(null);
  const [metrics, setMetrics] = useState<IMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form states for timing and phone
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Cash Handovers State
  const [deposits, setDeposits] = useState<any[]>([]);
  const [isDepositsLoading, setIsDepositsLoading] = useState(false);
  const [settlementFilter, setSettlementFilter] = useState<"pending" | "history">("pending");

  useEffect(() => {
    fetchStoreData();
    fetchCashDeposits();
  }, []);

  const fetchStoreData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get("/api/store-manager");
      setStore(res.data.store);
      setMetrics(res.data.metrics);
      
      if (res.data.store) {
        setOpenTime(res.data.store.openingHours.open);
        setCloseTime(res.data.store.openingHours.close);
        setContactPhone(res.data.store.contactPhone || "");
      }
    } catch (error: any) {
      console.error("Failed to load store data", error);
      toast.error(error.response?.data?.error || "Failed to load store information");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCashDeposits = async () => {
    try {
      setIsDepositsLoading(true);
      const res = await axios.get("/api/store-manager/cash-deposits");
      if (res.data.success) {
        setDeposits(res.data.deposits || []);
      }
    } catch (error) {
      console.error("Failed to load store cash deposits", error);
    } finally {
      setIsDepositsLoading(false);
    }
  };

  const handleProcessDeposit = async (depositId: string, action: "approve" | "reject", reason?: string) => {
    try {
      const res = await axios.patch("/api/store-manager/cash-deposits", {
        depositId,
        action,
        rejectionReason: reason || "Processed by store manager"
      });
      if (res.data.success) {
        toast.success(`Cash handover successfully ${action === "approve" ? "approved" : "rejected"}`);
        fetchCashDeposits();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${action} cash handover`);
    }
  };

  const handleToggleStatus = async (newStatus: "active" | "inactive" | "maintenance") => {
    setIsUpdating(true);
    try {
      const res = await axios.put("/api/store-manager", { status: newStatus });
      setStore(res.data.store);
      toast.success(`Store status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update store status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await axios.put("/api/store-manager", {
        openTime,
        closeTime,
        contactPhone,
      });
      setStore(res.data.store);
      toast.success("Settings updated successfully!");
    } catch {
      toast.error("Failed to update store settings");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[70vh]">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-3" />
        <p className="text-slate-500 text-sm">Loading store console...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-12 bg-white rounded-2xl border border-slate-100 shadow">
        <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700">No Store Assigned</h2>
        <p className="text-slate-500 text-sm mt-2">
          Your manager account is not currently linked to any active dark store. Please contact the administrator to setup manager routing.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30 uppercase tracking-wide">
              Live Outlet Operations
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-2">
              {store.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-slate-400" />
              {store.location.address}, {store.location.city} - {store.location.pincode}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">Operations:</span>
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => handleToggleStatus("active")}
                disabled={isUpdating}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  store.status === "active"
                    ? "bg-green-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Open
              </button>
              <button
                onClick={() => handleToggleStatus("maintenance")}
                disabled={isUpdating}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  store.status === "maintenance"
                    ? "bg-amber-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Maint.
              </button>
              <button
                onClick={() => handleToggleStatus("inactive")}
                disabled={isUpdating}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  store.status === "inactive"
                    ? "bg-red-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Closed
              </button>
            </div>
          </div>
        </div>
        {/* Background visual shape */}
        <div className="absolute right-0 bottom-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -z-10 translate-x-12 translate-y-12"></div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending Orders Card */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Active Store Orders
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {metrics?.pendingOrdersCount || 0}
            </h3>
            <span className="text-[10px] text-blue-600 font-medium">Needs packing or dispatch</span>
          </div>
        </div>

        {/* Out of stock card */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Out of stock products
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {metrics?.outOfStockCount || 0}
            </h3>
            <span className="text-[10px] text-red-500 font-medium">Requires replenishment</span>
          </div>
        </div>

        {/* Total Variants Card */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Active Inventory catalog
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {metrics?.totalVariantsCount || 0}
            </h3>
            <span className="text-[10px] text-green-600 font-medium">Mapped variant counts</span>
          </div>
        </div>

        {/* Active Staff Card */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Staff On-Duty
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {metrics?.activeStaffCount || 0}
            </h3>
            <span className="text-[10px] text-purple-600 font-medium">Active shift members</span>
          </div>
        </div>
      </div>

      {/* Main split sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Timings and details form */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Store Operational Details
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  Opening Hours
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    placeholder="e.g. 06:00"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  Closing Hours
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    placeholder="e.g. 23:00"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-500 transition"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  Store contact Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. +919876543210"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-500 transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUpdating}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium text-sm px-5 py-2.5 rounded-xl shadow transition cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Store Settings
              </button>
            </div>
          </form>
        </div>

        {/* Operational Status Display Info */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800">Operational Guidelines</h2>
          
          <div className="space-y-3 text-xs text-slate-500">
            <div className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-700">Open (Active)</strong>: Store is fully listed for buyers, orders are processed and delivery boys assigned.
              </p>
            </div>
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-700">Maintenance</strong>: Store shows as "Temporary Maintenance" in search lists. Checkout is blocked for this location.
              </p>
            </div>
            <div className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-700">Closed (Inactive)</strong>: Store catalog is completely hidden from public search zones. Use this for holiday or shift closures.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Handovers & Rider Settlements Review Panel */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">Rider Cash Settlements & Handovers</h2>
            <p className="text-xs text-slate-500 mt-1">Verify and approve offline cash collected by riders at your store.</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 self-start sm:self-center">
            <button
              onClick={() => setSettlementFilter("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                settlementFilter === "pending"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Pending Reviews ({deposits.filter(d => d.status === "pending").length})
            </button>
            <button
              onClick={() => setSettlementFilter("history")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                settlementFilter === "history"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Settlement History
            </button>
          </div>
        </div>

        {isDepositsLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading settlements logs...</div>
        ) : (
          <div className="space-y-4">
            {deposits.filter(d => settlementFilter === "pending" ? d.status === "pending" : d.status !== "pending").length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl">
                <p className="text-sm font-semibold text-slate-400">No cash handovers found</p>
                <p className="text-xs text-slate-400/80 mt-1">
                  {settlementFilter === "pending"
                    ? "There are no pending cash handovers awaiting review."
                    : "No past cash handover records exist for this store."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold tracking-wider">
                      <th className="py-3 px-2">Rider / Contact</th>
                      <th className="py-3 px-2">Handover Amount</th>
                      <th className="py-3 px-2">Reference Note</th>
                      <th className="py-3 px-2">Submitted Time</th>
                      {settlementFilter === "history" && <th className="py-3 px-2">Status</th>}
                      {settlementFilter === "pending" && <th className="py-3 px-2 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {deposits
                      .filter(d => settlementFilter === "pending" ? d.status === "pending" : d.status !== "pending")
                      .map((dep) => (
                        <tr key={dep._id} className="border-b border-slate-100/50 hover:bg-slate-50/50 transition">
                          <td className="py-3.5 px-2">
                            <p className="font-bold text-slate-800">{dep.deliveryPartner?.name || "Unknown Rider"}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{dep.deliveryPartner?.mobileNumber || dep.deliveryPartner?.email || "N/A"}</p>
                          </td>
                          <td className="py-3.5 px-2 font-bold text-slate-800 text-sm">
                            ₹{dep.amount}
                          </td>
                          <td className="py-3.5 px-2 text-slate-500 font-medium">
                            {dep.transactionId || <span className="text-slate-300">N/A</span>}
                          </td>
                          <td className="py-3.5 px-2 text-slate-400">
                            {new Date(dep.createdAt).toLocaleString("en-IN")}
                          </td>
                          {settlementFilter === "history" && (
                            <td className="py-3.5 px-2">
                              <span className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase ${
                                dep.status === "approved"
                                  ? "bg-green-50 text-green-600 border border-green-200"
                                  : "bg-red-50 text-red-600 border border-red-200"
                              }`}>
                                {dep.status}
                              </span>
                            </td>
                          )}
                          {settlementFilter === "pending" && (
                            <td className="py-3.5 px-2 text-right space-x-2">
                              <button
                                onClick={() => handleProcessDeposit(dep._id, "approve")}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg transition cursor-pointer text-[11px]"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt("Enter reason for rejection:", "Handover amount mismatch");
                                  if (reason !== null) {
                                    handleProcessDeposit(dep._id, "reject", reason);
                                  }
                                }}
                                className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg transition cursor-pointer text-[11px] border border-red-200"
                              >
                                Reject
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
