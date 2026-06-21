"use client";  

import { Package, Filter, X, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface OrderItem {
  _id: string;
  groceryName: string;
  quantity: number;
  price?: {
    sellingPrice: number;
  };
  grocery?: {
    images?: Array<{
      url: string;
      publicId: string;
    }>;
  };
}

interface Return {
  _id: string;
  order: string | { _id: string };
  requestType: "return" | "replacement";
  status: string;
  refund?: {
    transactionId?: string;
  };
}

interface Order {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  finalTotal: number;
  currency: string;
  createdAt: string;
  orderItems: OrderItem[];
}

interface FilterOptions {
  status: string;
  returnStatus: string;
  minAmount: string;
  maxAmount: string;
  sortBy: "newest" | "oldest" | "highest" | "lowest";
  datePreset: "all" | "today" | "3days" | "7days" | "30days" | "6months" | "1year";
}

export default function OrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    returnStatus: "all",
    minAmount: "",
    maxAmount: "",
    sortBy: "newest",
    datePreset: "all",
  });

  useEffect(() => {
    fetchOrders();
    fetchReturns();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, allOrders, search]);

  const fetchReturns = async () => {
    try {
      const res = await fetch("/api/returns");
      if (res.ok) {
        const data = await res.json();
        setReturns(data.returns || []);
      }
    } catch (err) {
      console.error("Failed to fetch returns:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/order/get-all");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setAllOrders(data.orders);
      setFilteredOrders(data.orders);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...allOrders];

    // Search filter - search across order number, ID, items, and amount
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((order) => {
        return (
          order.orderNumber.toLowerCase().includes(searchLower) ||
          order._id.toLowerCase().includes(searchLower) ||
          order.finalTotal.toString().includes(searchLower) ||
          order.orderItems.some((item) =>
            item.groceryName.toLowerCase().includes(searchLower)
          )
        );
      });
    }

    // Status filter
    if (filters.status !== "all") {
      result = result.filter((order) => order.orderStatus === filters.status);
    }

    // Return status filter
    if (filters.returnStatus !== "all") {
      result = result.filter((order) => {
        const orderReturns = returns.filter((ret) => {
          const retOrderId = typeof ret.order === "string"
            ? ret.order
            : (ret.order as any)?._id?.toString();
          return retOrderId === order._id;
        });
        switch (filters.returnStatus) {
          case "return-any":
            return orderReturns.some(
              (ret) => ret.requestType === "return" && ret.status !== "cancelled"
            );
          case "return-completed":
            return orderReturns.some(
              (ret) => ret.requestType === "return" && ret.status === "completed"
            );
          case "replacement-any":
            return orderReturns.some(
              (ret) => ret.requestType === "replacement" && ret.status !== "cancelled"
            );
          case "replacement-completed":
            return orderReturns.some(
              (ret) => ret.requestType === "replacement" && ret.status === "completed"
            );
          default:
            return false;
        }
      });
    }

    // Amount filter
    if (filters.minAmount) {
      result = result.filter(
        (order) => order.finalTotal >= parseFloat(filters.minAmount)
      );
    }

    if (filters.maxAmount) {
      result = result.filter(
        (order) => order.finalTotal <= parseFloat(filters.maxAmount)
      );
    }

    // Date preset filter
    const now = new Date();
    let dateStartTime = new Date(0); // Beginning of time for "all"

    if (filters.datePreset !== "all") {
      switch (filters.datePreset) {
        case "today":
          dateStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "3days":
          dateStartTime = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          break;
        case "7days":
          dateStartTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30days":
          dateStartTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "6months":
          dateStartTime = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
          break;
        case "1year":
          dateStartTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }

      result = result.filter(
        (order) => new Date(order.createdAt) >= dateStartTime
      );
    }

    // Sorting
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "highest":
          return b.finalTotal - a.finalTotal;
        case "lowest":
          return a.finalTotal - b.finalTotal;
        default:
          return 0;
      }
    });

    setFilteredOrders(result);
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      status: "all",
      returnStatus: "all",
      minAmount: "",
      maxAmount: "",
      sortBy: "newest",
      datePreset: "all",
    });
    setSearch("");
  };

  const isFiltersActive = () => {
    return (
      filters.status !== "all" ||
      filters.returnStatus !== "all" ||
      filters.minAmount ||
      filters.maxAmount ||
      filters.datePreset !== "all" ||
      filters.sortBy !== "newest"
    );
  };

  const getReturnStatusForOrder = (orderId: string) => {
    const orderReturn = returns.find((r) => {
      // Handle both string ID and populated object
      const returnOrderId = typeof r.order === 'string' ? r.order : (r.order as any)?._id;
      return returnOrderId === orderId;
    });
    
    if (!orderReturn) return null;
    
    if (orderReturn.requestType === "return" && orderReturn.status === "completed") {
      return { type: "Refunded", status: orderReturn.status, icon: "↩️" };
    } else if (orderReturn.requestType === "replacement") {
      if (orderReturn.status === "completed") {
        return { type: "Replaced", status: orderReturn.status, icon: "🔄" };
      } else {
        return { type: "In Replacement", status: orderReturn.status, icon: "⏳" };
      }
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "confirmed":
        return "text-blue-600 bg-blue-100";
      case "packed":
        return "text-purple-600 bg-purple-100";
      case "shipped":
        return "text-indigo-600 bg-indigo-100";
      case "out-for-delivery":
        return "text-orange-600 bg-orange-100";
      case "delivered":
        return "text-green-600 bg-green-100";
      case "cancelled":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getReturnStatusColor = (returnType: string) => {
    switch (returnType) {
      case "Refunded":
        return "text-orange-600 bg-orange-100";
      case "Replaced":
        return "text-blue-600 bg-blue-100";
      case "In Replacement":
        return "text-purple-600 bg-purple-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) + " at " + date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-2 pb-8">
      {/* Filter Drawer Overlay */}
      {showFilters && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={() => setShowFilters(false)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filters {isFiltersActive() && <span className="text-red-600">●</span>}
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number, product name, or amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter Drawer - Right Side */}
        <div
          className={`fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
            showFilters ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <h2 className="text-xl font-semibold">Advanced Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Order Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="out-for-delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Return Status
              </label>
              <select
                value={filters.returnStatus}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, returnStatus: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Orders</option>
                <option value="return-any">Returned (Any Status)</option>
                <option value="return-completed">Refund Completed</option>
                <option value="replacement-any">Replaced (Any Status)</option>
                <option value="replacement-completed">Replacement Completed</option>
              </select>
            </div>


            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Date Range
              </label>
              <select
                value={filters.datePreset}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    datePreset: e.target.value as FilterOptions["datePreset"],
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="3days">Last 3 Days</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last 1 Year</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Amount Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minAmount}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, minAmount: e.target.value }))
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxAmount}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, maxAmount: e.target.value }))
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as FilterOptions["sortBy"],
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
              </select>
            </div>

            {isFiltersActive() && (
              <button
                onClick={() => {
                  setFilters({
                    status: "all",
                    returnStatus: "all",
                    minAmount: "",
                    maxAmount: "",
                    sortBy: "newest",
                    datePreset: "all",
                  });
                }}
                className="w-full px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* Results Info */}
        {allOrders.length > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            Showing <span className="font-medium">{filteredOrders.length}</span> of{" "}
            <span className="font-medium">{allOrders.length}</span> orders
          </div>
        )}

        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {allOrders.length === 0 ? "No orders yet" : "No orders found"}
            </h2>
            <p className="text-gray-600 mb-8">
              {allOrders.length === 0
                ? "Start shopping to see your orders here"
                : "Try adjusting your search or filters"}
            </p>
            {allOrders.length === 0 && (
              <Link
                href="/"
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Continue Shopping
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <Link
                key={order._id}
                href={`/user/orders/${order._id}`}
                className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(order.createdAt)}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {order.orderItems
                          .slice(0, 2)
                          .map((item) => item.groceryName)
                          .join(", ")}
                        {order.orderItems.length > 2 &&
                          ` +${order.orderItems.length - 2} more`}
                      </p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex flex-col sm:items-end gap-2">
                      <div className="flex gap-2 justify-end flex-wrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            order.orderStatus
                          )}`}
                        >
                          {order.orderStatus.replace("-", " ").toUpperCase()}
                        </span>
                        {getReturnStatusForOrder(order._id) && (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getReturnStatusColor(
                              getReturnStatusForOrder(order._id)?.type || ""
                            )}`}
                          >
                            {getReturnStatusForOrder(order._id)?.type.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {order.currency} {order.finalTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {order.orderItems.slice(0, 3).map((item) => (
                        <div key={item._id} className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                            {item.grocery?.images && item.grocery.images.length > 0 ? (
                              <img
                                src={item.grocery.images[0].url}
                                alt={item.groceryName}
                                className="w-12 h-12 object-cover"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        </div>
                      ))}
                      {order.orderItems.length > 3 && (
                        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            +{order.orderItems.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.orderItems.length} item
                      {order.orderItems.length > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
