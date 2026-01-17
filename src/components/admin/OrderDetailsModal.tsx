"use client";

import { motion } from "framer-motion";
import { X, ShoppingCart, User, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import axios from "axios";

const OrderDetailsModal = ({ order, onClose, onUpdate }: any) => {
  const handleStatusChange = async (status: string) => {
    try {
      const res = await axios.patch(`/api/admin/order/${order._id}`, {
        orderStatus: status,
      });
      if (res.data.success) {
        toast.success("Order status updated");
        onUpdate();
      } else {
        toast.error("Failed to update order status");
      }
    } catch (error) {
      toast.error("Failed to update order status");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Order Details</h2>
            <p className="text-sm text-gray-600">Order #{order.orderNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <ShoppingCart size={20} /> Order Items
                </h3>
                <div className="space-y-3">
                  {order.orderItems?.map((item: any) => (
                    <div
                      key={item._id}
                      className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg"
                    >
                      <Image
                        src={
                          item.grocery?.images?.[0]?.url || "/placeholder.png"
                        }
                        alt={item.grocery?.name || "Product"}
                        width={64}
                        height={64}
                        className="rounded-md"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {item.grocery?.name ||
                            item.groceryName ||
                            "Unknown Product"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">
                          ₹{(item.price?.sellingPrice || 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">
                  Payment Summary
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-gray-800">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{(order.subTotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>₹{(order.deliveryFee || 0).toFixed(2)}</span>
                  </div>
                  {order.coupon && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({order.coupon.code})</span>
                      <span>
                        - ₹{(order.coupon.discountAmount || 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>₹{(order.finalTotal || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer & Status */}
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <User size={20} /> Customer
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p className="font-semibold">{order.userId.name}</p>
                  <p className="text-sm text-gray-600">{order.userId.email}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} />
                    <span>{order.deliveryAddress?.mobile || "N/A"}</span>
                  </div>
                </div>
              </div>
              {/* Shipping Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <MapPin size={20} /> Shipping Address
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                  <p>{order.deliveryAddress?.fullAddress || "N/A"}</p>
                  <p>
                    {order.deliveryAddress?.city || "N/A"},{" "}
                    {order.deliveryAddress?.state || "N/A"}{" "}
                    {order.deliveryAddress?.pincode || "N/A"}
                  </p>
                  <p>{}</p>
                </div>
              </div>

              {/* Order Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">
                  Update Order Status
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    "pending",
                    "confirmed",
                    "packed",
                    "shipped",
                    "out-for-delivery",
                    "delivered",
                    "cancelled",
                  ].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={order.orderStatus === status}
                      className={`px-3 py-1 text-sm rounded-full transition ${
                        order.orderStatus === status
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderDetailsModal;
