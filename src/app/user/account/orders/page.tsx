"use client";

import { Package } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useRouter } from "next/navigation";

interface OrderItem {
  _id: string;
  groceryName: string;
  quantity: number;
  price?: {
    sellingPrice: number;
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userData = useSelector((state: RootState) => state.user.userData);
  const router = useRouter();

  useEffect(() => {
    // Redirect non-user roles to their respective dashboards
    if (userData?.role === "admin") {
      router.push("/admin");
      return;
    }
    if (userData?.role === "deliveryBoy") {
      router.push("/user/account/profile");
      return;
    }
    
    // Only fetch orders for regular users
    if (userData?.role === "user") {
      fetchOrders();
    }
  }, [userData, router]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/order/get-all");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

        {orders.length === 0 ? (
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
              No orders yet
            </h2>
            <p className="text-gray-600 mb-8">
              Start shopping to see your orders here
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Link
                key={order._id}
                href={`/user/account/orders/${order._id}`}
                className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex flex-col sm:items-end">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          order.orderStatus
                        )}`}
                      >
                        {order.orderStatus.replace("-", " ").toUpperCase()}
                      </span>
                      <p className="text-lg font-bold text-gray-900 mt-2">
                        {order.currency} {order.finalTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {order.orderItems.slice(0, 3).map((item) => (
                        <div key={item._id} className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        </div>
                      ))}
                      {order.orderItems.length > 3 && (
                        <div className="flex-shrink-0 w-12 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
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
