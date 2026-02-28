"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Download, Eye, Ban, CheckCircle } from "lucide-react";

interface DeliveryPartner {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    mobileNumber: string;
    isBlocked?: boolean;
  };
  kyc?: {
    status?: "not_submitted" | "pending" | "approved" | "rejected";
  };
  isOnline: boolean;
  gender?: string;
  stats: {
    totalDeliveries: number;
    cancelledDeliveries: number;
    averageRating: number;
  };
  earnings: {
    total: number;
    pendingPayout: number;
  };
}

interface Stats {
  total: number;
  online: number;
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  avgRating: number;
}

export default function DeliveryPartnersPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "deliveries" | "rating" | "earnings">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/admin/delivery-partners");
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setPartners(data.partners || []);
        setStats(data.stats || { total: 0, online: 0, maleCount: 0, femaleCount: 0, otherCount: 0, avgRating: 0 });
      } else {
        toast.error(data.message || "Failed to fetch partners");
      }
    } catch (error) {
      console.error("Failed to fetch partners:", error);
      toast.error("Failed to fetch delivery partners");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockToggle = async (partnerId: string, isBlocked: boolean) => {
    try {
      const res = await fetch(`/api/admin/delivery-partners/${partnerId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: !isBlocked }),
      });

      if (res.ok) {
        toast.success(isBlocked ? "Partner unblocked successfully" : "Partner blocked successfully");
        fetchPartners();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update partner status");
      }
    } catch (error) {
      toast.error("Error updating partner status");
    }
  };

  const handleExportCSV = () => {
    const dataToExport = filteredAndSortedPartners();
    const csvData = dataToExport.map((p: DeliveryPartner) => ({
      Name: p.user?.name || "",
      Email: p.user?.email || "",
      Mobile: p.user?.mobileNumber || "",
      Gender: p.gender || "N/A",
      Status: p.isOnline ? "Online" : "Offline",
      TotalDeliveries: p.stats.totalDeliveries,
      Rating: p.stats.averageRating.toFixed(1),
      TotalEarnings: `₹${p.earnings.total.toFixed(2)}`,
      PendingPayout: `₹${p.earnings.pendingPayout.toFixed(2)}`,
    }));

    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(","),
      ...csvData.map((row: any) => headers.map((h) => `"${row[h]}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivery-partners-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const getFilteredPartners = () => {
    let filtered = partners;

    // Apply status filter
    if (filter === "online") filtered = filtered.filter((p) => p.isOnline);
    if (filter === "offline") filtered = filtered.filter((p) => !p.isOnline);
    if (filter === "male") filtered = filtered.filter((p) => p.gender === "male");
    if (filter === "female") filtered = filtered.filter((p) => p.gender === "female");

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.user?.name || "").toLowerCase().includes(query) ||
          (p.user?.email || "").toLowerCase().includes(query) ||
          (p.user?.mobileNumber || "").includes(query)
      );
    }

    return filtered;
  };

  const filteredAndSortedPartners = () => {
    const filtered = getFilteredPartners();

    return filtered.sort((a, b) => {
      let compareA, compareB;

      switch (sortBy) {
        case "name":
          compareA = (a.user?.name || "").toLowerCase();
          compareB = (b.user?.name || "").toLowerCase();
          break;
        case "deliveries":
          compareA = a.stats.totalDeliveries;
          compareB = b.stats.totalDeliveries;
          break;
        case "rating":
          compareA = a.stats.averageRating;
          compareB = b.stats.averageRating;
          break;
        case "earnings":
          compareA = a.earnings.total;
          compareB = b.earnings.total;
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });
  };

  const handleSort = (field: "name" | "deliveries" | "rating" | "earnings") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  const filtered = filteredAndSortedPartners();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Delivery Partners</h1>
        <p className="text-gray-600">
          Manage and monitor delivery partner network
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Total Partners</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <p className="text-green-700 text-sm">Online Now</p>
            <p className="text-3xl font-bold text-green-600">{stats.online}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow">
            <p className="text-blue-700 text-sm">Avg Rating</p>
            <p className="text-3xl font-bold text-blue-600">
              {typeof stats.avgRating === 'number' ? stats.avgRating.toFixed(1) : '0.0'}⭐
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg shadow">
            <p className="text-purple-700 text-sm">Gender Mix</p>
            <p className="text-sm font-semibold text-purple-600">
              M: {stats.maleCount} | F: {stats.femaleCount} | O: {stats.otherCount}
            </p>
          </div>
        </div>
      )}

      {/* Search & Export Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-5 w-5" />
          Export CSV
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "online", "offline", "male", "female"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg capitalize transition ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort("name")} className="hover:text-blue-600 flex items-center gap-1">
                    Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KYC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort("deliveries")} className="hover:text-blue-600 flex items-center gap-1">
                    Deliveries {sortBy === "deliveries" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort("rating")} className="hover:text-blue-600 flex items-center gap-1">
                    Rating {sortBy === "rating" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort("earnings")} className="hover:text-blue-600 flex items-center gap-1">
                    Earnings {sortBy === "earnings" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending Payout
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((partner) => (
                <tr key={partner._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {partner.user?.name || "Unknown"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{partner.user?.email || ""}</div>
                    <div className="text-sm text-gray-500">{partner.user?.mobileNumber || ""}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize text-gray-700">{partner.gender || "N/A"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        partner.isOnline
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {partner.isOnline ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                        partner.kyc?.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : partner.kyc?.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : partner.kyc?.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {partner.kyc?.status || "not_submitted"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {partner.stats.totalDeliveries}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {partner.stats.averageRating.toFixed(1)}⭐
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    ₹{partner.earnings.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    ₹{partner.earnings.pendingPayout.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() =>
                          partner.user?._id &&
                          router.push(`/admin/delivery-partners/${partner.user._id}`)
                        }
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        title="View Details"
                        disabled={!partner.user?._id}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          partner.user?._id &&
                          handleBlockToggle(partner.user._id, partner.user.isBlocked || false)
                        }
                        className={`flex items-center gap-1 ${
                          partner.user?.isBlocked
                            ? "text-green-600 hover:text-green-900"
                            : "text-red-600 hover:text-red-900"
                        }`}
                        title={partner.user?.isBlocked ? "Unblock Partner" : "Block Partner"}
                        disabled={!partner.user?._id}
                      >
                        {partner.user?.isBlocked ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No delivery partners found
          </div>
        )}
      </div>
    </div>
  );
}
