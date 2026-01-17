"use client";
import React from "react";
import { EyeIcon } from "@heroicons/react/24/outline";
import { IndianRupee } from "lucide-react";

// Define a type for the order for better type safety
export interface Order {
  _id: string;
  orderNumber: string;
  userId: {
    name: string;
  };
  finalTotal: number;
  orderStatus:
    | "pending"
    | "confirmed"
    | "packed"
    | "shipped"
    | "out-for-delivery"
    | "delivered"
    | "cancelled";
  paymentStatus: "pending" | "paid" | "failed";
  paymentMethod: "cod" | "online";
  onlinePaymentType?: "stripe" | "razorpay";
  createdAt: string;
}

interface OrderTableProps {
  orders: Order[];
  onViewOrder: (order: Order) => void;
  variant?: "dashboard" | "full"; // dashboard hides customer on sm, full shows all
}

const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  onViewOrder,
  variant = "full",
}) => {
  const getStatusChipClass = (status: string) => {
    switch (status) {
      case "delivered":
      case "paid":
        return "bg-green-100 text-green-800 border border-green-200";
      case "cancelled":
      case "failed":
        return "bg-red-100 text-red-800 border border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "shipped":
      case "out-for-delivery":
      case "confirmed":
      case "packed":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const isDashboard = variant === "dashboard";

  return (
    <div className="overflow-x-auto">
      <table
        className={`min-w-full divide-y ${
          isDashboard ? "divide-gray-100" : "divide-gray-200"
        }`}
      >
        <thead
          className={
            isDashboard
              ? "bg-gradient-to-r from-gray-50 to-gray-100"
              : "bg-gray-50"
          }
        >
          <tr>
            <th
              scope="col"
              className={`px-3 md:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                isDashboard ? "font-semibold" : "font-medium"
              }`}
            >
              Order ID
            </th>
            <th
              scope="col"
              className={`px-3 md:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                isDashboard
                  ? "hidden sm:table-cell font-semibold"
                  : "font-medium"
              }`}
            >
              Customer
            </th>
            <th
              scope="col"
              className={`px-3 md:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                isDashboard ? "font-semibold" : "font-medium"
              }`}
            >
              Date
            </th>
            {isDashboard && (
              <th
                scope="col"
                className="px-3 md:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
              >
                Status
              </th>
            )}
            <th
              scope="col"
              className={`px-3 md:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                isDashboard ? "font-semibold" : "font-medium"
              }`}
            >
              Total
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Payment Method
            </th>
            {!isDashboard && (
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Order Status
              </th>
            )}
            <th
              scope="col"
              className={`px-3 md:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                isDashboard ? "font-semibold" : "font-medium"
              }`}
            >
              Payment
            </th>
            <th
              scope="col"
              className={`px-3 md:px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                isDashboard ? "font-semibold" : "font-medium"
              }`}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody
          className={`bg-white divide-y ${
            isDashboard ? "divide-gray-50" : "divide-gray-200"
          }`}
        >
          {orders.map((order, index) => (
            <tr
              key={order._id}
              className={
                isDashboard
                  ? `hover:bg-gray-50 transition-colors duration-200 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-25"
                    }`
                  : ""
              }
            >
              <td
                className={`px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900 ${
                  isDashboard ? "text-xs md:text-sm" : "text-sm"
                }`}
              >
                {order.orderNumber}
              </td>
              <td
                className={`px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-600 ${
                  isDashboard ? "hidden sm:table-cell" : "text-gray-500"
                }`}
              >
                {order.userId.name}
              </td>
              <td
                className={`px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-600 ${
                  isDashboard ? "" : "text-gray-500"
                }`}
              >
                {new Date(order.createdAt).toLocaleDateString(
                  isDashboard ? "en-US" : undefined,
                  isDashboard
                    ? {
                        month: "short",
                        day: "numeric",
                        year: window?.innerWidth < 640 ? "2-digit" : "numeric",
                      }
                    : undefined
                )}
              </td>
              {isDashboard && (
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusChipClass(
                      order.orderStatus
                    )}`}
                  >
                    {order.orderStatus.charAt(0).toUpperCase() +
                      order.orderStatus.slice(1)}
                  </span>
                </td>
              )}
              <td
                className={`px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900 flex items-center ${
                  isDashboard ? "" : "text-gray-500"
                }`}
              >
                <IndianRupee size={14} />
                {order.finalTotal.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusChipClass(
                    order.paymentMethod === "cod"
                      ? "cod"
                      : order.onlinePaymentType || "online"
                  )}`}
                >
                  {order.paymentMethod === "cod"
                    ? "COD"
                    : order.onlinePaymentType
                    ? order.onlinePaymentType.charAt(0).toUpperCase() +
                      order.onlinePaymentType.slice(1)
                    : "Online"}
                </span>
              </td>
              {!isDashboard && (
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusChipClass(
                      order.orderStatus
                    )}`}
                  >
                    {order.orderStatus}
                  </span>
                </td>
              )}
              <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusChipClass(
                    order.paymentStatus
                  )}`}
                >
                  {order.paymentStatus.charAt(0).toUpperCase() +
                    order.paymentStatus.slice(1)}
                </span>
              </td>
              <td
                className={`px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                  isDashboard ? "" : "text-sm"
                }`}
              >
                <button
                  onClick={() => onViewOrder(order)}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  <EyeIcon className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
