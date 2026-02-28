"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import OrderDetailsModal from "@/components/admin/OrderDetailsModal";
import OrderTable, { Order } from "@/components/admin/OrderTable";
import { toast } from "sonner";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const wasFocusedRef = useRef(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `/api/admin/order?page=${page}&limit=10&search=${encodeURIComponent(
          debouncedSearch,
        )}&filter=${orderFilter}`,
      );
      if (res.data.success) {
        setOrders(res.data.orders);
        setTotalPages(res.data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, orderFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1); // Reset to page 1 when debounced search changes
  }, [debouncedSearch]);

  useEffect(() => {
    fetchOrders();
  }, [page, debouncedSearch, fetchOrders]);

  useEffect(() => {
    if (!loading && wasFocusedRef.current && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loading]);

  const handleViewOrder = (order: Order) => {
    // Open modal immediately with basic order data
    setSelectedOrder(order);
    setIsModalOpen(true);

    // Fetch detailed order info in background
    axios
      .get(`/api/admin/order/${order._id}`)
      .then((res) => {
        if (res.data.success) {
          setSelectedOrder(res.data.order);
        } else {
          toast.error("Failed to fetch order details");
        }
      })
      .catch((error) => {
        console.error("Failed to fetch order details", error);
        toast.error("Failed to fetch order details");
      });
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await axios.patch(`/api/admin/order/${orderId}`, {
        orderStatus: newStatus,
      });
      if (res.data.success) {
        toast.success("Order status updated");
        fetchOrders(); // Refresh the list
      } else {
        toast.error("Failed to update order status");
      }
    } catch (error) {
      toast.error("Failed to update order status");
    }
  };

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold mb-6">Manage Orders</h1>

        <div className="mb-6 space-y-4">
          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setOrderFilter("all");
                setPage(1);
              }}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                orderFilter === "all"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => {
                setOrderFilter("with-refunds");
                setPage(1);
              }}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                orderFilter === "with-refunds"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
              }`}
            >
              ✓ Refunded Orders
            </button>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search by Order ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search orders by order ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => {
                  wasFocusedRef.current = true;
                }}
                onBlur={() => {
                  wasFocusedRef.current = false;
                }}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">Loading orders...</div>
          ) : (
            <>
              <OrderTable
                orders={orders}
                onViewOrder={handleViewOrder}
                variant="full"
              />
              {/* Pagination */}
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {isModalOpen && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setIsModalOpen(false)}
          onUpdate={() => {
            setIsModalOpen(false);
            fetchOrders();
          }}
        />
      )}
    </>
  );
};

export default OrdersPage;
