"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import TimelineStepper from "@/components/TimelineStepper";

interface OrderItem {
  _id: string;
  groceryName: string;
  quantity: number;
  price: {
    mrpPrice: number;
    sellingPrice: number;
  };
  variant?: {
    label: string;
    unit: string;
    value: number;
  };
  grocery?: {
    images?: {
      url: string;
      publicId: string;
    }[];
    name?: string;
  };
}

interface Order {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  finalTotal: number;
  subTotal: number;
  savings: number;
  deliveryFee: number;
  couponDiscount?: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  deliveryAddress: {
    fullName: string;
    mobile: string;
    fullAddress: string;
    city: string;
    state: string;
    pincode: string;
  };
  createdAt: string;
  orderItems: OrderItem[];
}

interface TimelineItem {
  status: string;
  label: string;
  time?: string;
  completed: boolean;
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      fetchTimeline();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const res = await fetch(`/api/order/fetch-order-details/${orderId}`);
      if (!res.ok) throw new Error("Failed to fetch order details");
      const data = await res.json();
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchTimeline = async () => {
    try {
      const res = await fetch(`/api/order/timeline/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.timeline);
      } else {
        // Use fallback timeline
        createFallbackTimeline();
      }
    } catch (err: any) {
      // Silently use fallback timeline
      createFallbackTimeline();
    } finally {
      setLoading(false);
    }
  };

  const createFallbackTimeline = () => {
    const statusFlow = [
      "pending",
      "confirmed",
      "packed",
      "shipped",
      "out-for-delivery",
      "delivered",
    ];

    const currentIndex = statusFlow.indexOf(order?.orderStatus || "");

    const defaultTimeline = [
      {
        status: "pending",
        label: "Order Placed",
        time: order?.createdAt,
        completed: true,
      },
      {
        status: "confirmed",
        label: "Order Confirmed",
        time: undefined,
        completed: currentIndex >= statusFlow.indexOf("confirmed"),
      },
      {
        status: "packed",
        label: "Packed",
        time: undefined,
        completed: currentIndex >= statusFlow.indexOf("packed"),
      },
      {
        status: "shipped",
        label: "Shipped",
        time: undefined,
        completed: currentIndex >= statusFlow.indexOf("shipped"),
      },
      {
        status: "out-for-delivery",
        label: "Out for Delivery",
        time: undefined,
        completed: currentIndex >= statusFlow.indexOf("out-for-delivery"),
      },
      {
        status: "delivered",
        label: "Delivered",
        time: undefined,
        completed: currentIndex >= statusFlow.indexOf("delivered"),
      },
    ];

    setTimeline(defaultTimeline);
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
      month: "long",
      year: "numeric",
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

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error || "Order not found"}</p>
          <Link
            href="/user/account/orders"
            className="inline-flex items-center px-6 py-3 mt-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/user/account/orders"
            className="inline-flex items-center text-green-600 hover:text-green-700 mb-4"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Orders
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Order Details
              </h1>
              <p className="text-lg text-gray-600 mt-1">
                Order #{order.orderNumber}
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <span
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                  order.orderStatus
                )}`}
              >
                {order.orderStatus.replace("-", " ").toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <TimelineStepper
                timeline={timeline}
                currentStatus={order.orderStatus}
              />
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Order Items
              </h2>
              <div className="space-y-4">
                {order.orderItems.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center space-x-4 py-4 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex-shrink-0">
                      {item.grocery?.images?.[0]?.url ? (
                        <Image
                          src={item.grocery.images[0].url}
                          alt={`${item.groceryName} - Order item`}
                          width={80}
                          height={80}
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 truncate">
                        {item.groceryName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity}
                        {item.variant && ` (${item.variant.label})`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {order.currency}{" "}
                        {(
                          Number(item.price?.sellingPrice || 0) *
                          Number(item.quantity || 0)
                        ).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.currency}{" "}
                        {Number(item.price?.sellingPrice || 0).toFixed(2)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Order Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">
                    {order.currency} {order.subTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium">
                    {order.currency} {order.deliveryFee.toFixed(2)}
                  </span>
                </div>
                {order.couponDiscount && order.couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span className="font-medium">
                      -{order.currency} {order.couponDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Savings</span>
                  <span className="font-medium text-green-600">
                    -{order.currency} {order.savings.toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>
                      {order.currency} {order.finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment & Delivery Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Payment & Delivery
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Payment Method
                  </h3>
                  <p className="text-gray-600 capitalize">
                    {order.paymentMethod}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">
                    Status: {order.paymentStatus}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Delivery Address
                  </h3>
                  <div className="text-gray-600">
                    <p className="font-medium">
                      {order.deliveryAddress.fullName}
                    </p>
                    <p>{order.deliveryAddress.fullAddress}</p>
                    <p>
                      {order.deliveryAddress.city},{" "}
                      {order.deliveryAddress.state} -{" "}
                      {order.deliveryAddress.pincode}
                    </p>
                    <p className="mt-1">{order.deliveryAddress.mobile}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Order Date</h3>
                  <p className="text-gray-600">{formatDate(order.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
