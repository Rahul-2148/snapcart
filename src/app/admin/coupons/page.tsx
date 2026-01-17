// src/app/admin/coupons/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Tag,
  Percent,
  IndianRupee,
  Users,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Coupon } from "@/types/custom";
import CreateCouponModal from "@/components/admin/CreateCouponModal";
import EditCouponModal from "@/components/admin/EditCouponModal";
import axios from "axios";

const AdminCouponsPage = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [totalCoupons, setTotalCoupons] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Load coupons
  useEffect(() => {
    loadCoupons();
  }, [statusFilter, search]);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        search: search,
      });

      const response = await axios.get(`/api/admin/coupon?${params}`);
      const data = response.data;

      if (data.success) {
        setCoupons(data.coupons);
        setTotalCoupons(data.totalCoupons || 0);
      } else {
        toast.error("Failed to load coupons");
      }
    } catch (error) {
      console.error("Failed to load coupons:", error);
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const response = await axios.delete(`/api/admin/coupon/${id}`);
      const data = response.data;

      if (data.success) {
        toast.success(data.message);
        loadCoupons(); // Refresh list
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Failed to delete coupon:", error);
      toast.error("Failed to delete coupon");
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await axios.put(`/api/admin/coupon/${id}`, {
        isActive: !currentStatus,
      });

      const data = response.data;

      if (data.success) {
        toast.success(`Coupon ${!currentStatus ? "activated" : "deactivated"}`);
        loadCoupons();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Failed to toggle coupon status:", error);
      toast.error("Failed to update coupon");
    }
  };

  const handleExportCoupons = async () => {
    setExportLoading(true);
    try {
      const response = await axios.get(
        `/api/admin/coupon/export?status=${statusFilter}&search=${search}`,
        {
          responseType: "arraybuffer",
        }
      );
      const data = response.data;

      if (data && data.byteLength > 0) {
        // Create and download CSV
        const blob = new Blob([data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `coupons_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast.success("Coupons exported successfully!");
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export coupons");
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    if (!coupon.isActive) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full flex items-center gap-1 w-fit">
          <XCircle size={12} />
          Inactive
        </span>
      );
    }

    if (endDate < now) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full flex items-center gap-1 w-fit">
          <Clock size={12} />
          Expired
        </span>
      );
    }

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    if (endDate > now && endDate <= sevenDaysFromNow) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full flex items-center gap-1 w-fit">
          <Clock size={12} />
          Expiring Soon
        </span>
      );
    }

    if (startDate > now) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full flex items-center gap-1 w-fit">
          <Clock size={12} />
          Upcoming
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center gap-1 w-fit">
        <CheckCircle size={12} />
        Active
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getDiscountText = (coupon: Coupon) => {
    if (coupon.discountType === "PERCENTAGE") {
      return `${coupon.discountValue}% off${
        coupon.maxDiscountAmount ? ` (max ₹${coupon.maxDiscountAmount})` : ""
      }`;
    } else {
      return `₹${coupon.discountValue} off`;
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Coupon Management
          </h1>
          <p className="text-gray-600 mt-1">
            Create and manage discount coupons
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={handleExportCoupons}
            disabled={exportLoading || coupons.length === 0}
            className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
            ) : (
              <Download size={18} />
            )}
            Export CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition"
          >
            <Plus size={20} />
            Create Coupon
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search
                className="absolute left-3 top-3.5 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search coupon code, event tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Filter
                className="absolute left-3 top-3 text-gray-400"
                size={18}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="upcoming">Upcoming</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Coupons</p>
              <p className="text-2xl font-bold text-gray-900">{totalCoupons}</p>
            </div>
            <Tag className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Coupons</p>
              <p className="text-2xl font-bold text-gray-900">
                {
                  coupons.filter(
                    (c) =>
                      c.isActive &&
                      new Date(c.endDate) >= new Date() &&
                      new Date(c.startDate) <= new Date()
                  ).length
                }
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {coupons.reduce(
                  (sum, coupon) => sum + (coupon.usageCount || 0),
                  0
                )}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expiring Soon (7 days)</p>
              <p className="text-2xl font-bold text-gray-900">
                {
                  coupons.filter((c) => {
                    const endDate = new Date(c.endDate);
                    const sevenDaysFromNow = new Date();
                    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                    return endDate <= sevenDaysFromNow && endDate >= new Date();
                  }).length
                }
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            <p className="mt-3 text-gray-600">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Tag className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No coupons found
            </h3>
            <p className="text-gray-500 mb-6">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filter"
                : "Get started by creating your first coupon"}
            </p>
            {!search && statusFilter === "all" && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition"
              >
                <Plus size={18} />
                Create Your First Coupon
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coupon Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Validity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {coupons.map((coupon) => (
                    <motion.tr
                      key={coupon._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                              {coupon.discountType === "PERCENTAGE" ? (
                                <Percent className="h-5 w-5 text-green-600" />
                              ) : (
                                <IndianRupee className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                {coupon.code}
                              </code>
                              {coupon.eventTag && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  {coupon.eventTag}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Created {formatDate(coupon.createdAt)}
                              {coupon.minCartValue
                                ? ` • Min cart: ₹${coupon.minCartValue}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {getDiscountText(coupon)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-gray-900">
                              Start: {formatDate(coupon.startDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-gray-900">
                              End: {formatDate(coupon.endDate)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-gray-900">
                              Used: {coupon.usageCount || 0}
                              {coupon.usageLimit
                                ? ` / ${coupon.usageLimit}`
                                : " / ∞"}
                            </span>
                          </div>
                          {coupon.usagePerUser && (
                            <div className="text-xs text-gray-500">
                              {coupon.usagePerUser} per user
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(coupon)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedCoupon(coupon);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() =>
                              handleToggleActive(coupon._id, coupon.isActive)
                            }
                            className={`p-1.5 rounded transition ${
                              coupon.isActive
                                ? "text-orange-600 hover:bg-orange-50"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                            title={coupon.isActive ? "Deactivate" : "Activate"}
                          >
                            {coupon.isActive ? (
                              <XCircle size={18} />
                            ) : (
                              <CheckCircle size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(coupon._id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateCouponModal
          onClose={() => {
            setShowCreateModal(false);
            loadCoupons();
          }}
        />
      )}

      {showEditModal && selectedCoupon && (
        <EditCouponModal
          coupon={selectedCoupon}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCoupon(null);
            loadCoupons();
          }}
        />
      )}
    </div>
  );
};

export default AdminCouponsPage;
