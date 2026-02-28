"use client";

import { useState, useEffect } from "react";

interface IPayout {
  _id: string;
  deliveryPartner: {
    name: string;
    email: string;
    mobileNumber: string;
  };
  amount: number;
  status: string;
  period: {
    startDate: string;
    endDate: string;
  };
  deliveriesCount: number;
  earnedAmount: number;
  deductedAmount: number;
  notes: string;
  createdAt: string;
}

export default function AdminPayoutsDashboard() {
  const [payouts, setPayouts] = useState<IPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersVersion, setFiltersVersion] = useState(0);
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(
    new Set(),
  );
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPayouts();
  }, [status, page, filtersVersion]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status,
        page: String(page),
      });
      if (search.trim()) params.set("q", search.trim());
      if (dateFrom) params.set("startDate", dateFrom);
      if (dateTo) params.set("endDate", dateTo);
      if (minAmount) params.set("minAmount", minAmount);
      if (maxAmount) params.set("maxAmount", maxAmount);

      const res = await fetch(`/api/admin/payouts?${params.toString()}`);
      const data = await res.json();
      setPayouts(data.payouts || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error("Failed to fetch payouts:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setSelectedPayouts(new Set());
    setPage(1);
    setFiltersVersion((prev) => prev + 1);
  };

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
    setSelectedPayouts(new Set());
    setPage(1);
    setFiltersVersion((prev) => prev + 1);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        status,
        export: "csv",
      });
      if (search.trim()) params.set("q", search.trim());
      if (dateFrom) params.set("startDate", dateFrom);
      if (dateTo) params.set("endDate", dateTo);
      if (minAmount) params.set("minAmount", minAmount);
      if (maxAmount) params.set("maxAmount", maxAmount);

      const res = await fetch(`/api/admin/payouts?${params.toString()}`);
      if (!res.ok) {
        alert("Export failed");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "delivery-payouts.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed");
    }
  };

  const handleSelectPayout = (payoutId: string) => {
    const newSelected = new Set(selectedPayouts);
    if (newSelected.has(payoutId)) {
      newSelected.delete(payoutId);
    } else {
      newSelected.add(payoutId);
    }
    setSelectedPayouts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPayouts.size === payouts.length) {
      setSelectedPayouts(new Set());
    } else {
      setSelectedPayouts(new Set(payouts.map((p) => p._id)));
    }
  };

  const handleAction = async (action: string) => {
    if (selectedPayouts.size === 0) {
      alert("Please select at least one payout");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          payoutIds: Array.from(selectedPayouts),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setSelectedPayouts(new Set());
        await fetchPayouts();
      } else {
        alert(data.error || "Action failed");
      }
    } catch (error) {
      console.error("Action failed:", error);
      alert("Failed to perform action");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Delivery Partner Payouts
          </h1>
          <p className="text-gray-600 mt-2">
            Manage weekly payouts for delivery partners
          </p>
        </div>

        {/* Status Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {["pending", "processing", "completed", "failed"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                setSelectedPayouts(new Set());
                setPage(1);
              }}
              className={`px-4 py-2 font-medium capitalize ${
                status === s
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name / email / phone"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Min Amount</label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Max Amount</label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Clear
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        {selectedPayouts.size > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <span className="text-sm text-gray-600">
              {selectedPayouts.size} payout(s) selected
            </span>
            {status === "pending" && (
              <>
                <button
                  onClick={() => handleAction("release")}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Release for Processing
                </button>
                <button
                  onClick={() => handleAction("reject")}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            {status === "processing" && (
              <button
                onClick={() => handleAction("complete")}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Mark as Completed
              </button>
            )}
          </div>
        )}

        {/* Payouts Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">Loading...</div>
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600">
              No payouts found with status: {status}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedPayouts.size === payouts.length &&
                        payouts.length > 0
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Partner Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Deliveries
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Deductions
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Period
                  </th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr
                    key={payout._id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-6 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPayouts.has(payout._id)}
                        onChange={() => handleSelectPayout(payout._id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {payout.deliveryPartner.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {payout.deliveryPartner.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-semibold text-lg text-green-600">
                        ₹{payout.amount}
                      </p>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {payout.deliveriesCount}
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-sm text-red-600">
                        -₹
                        {payout.deductedAmount}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payout.status)}`}
                      >
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {new Date(payout.period.startDate).toLocaleDateString()} -{" "}
                      {new Date(payout.period.endDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded border border-gray-200 text-gray-700 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 rounded border border-gray-200 text-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
