// src/app/store-manager/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { 
  ShoppingBag, 
  User, 
  MapPin, 
  Phone, 
  Clock, 
  Loader2, 
  Check, 
  Truck, 
  PackageCheck,
  AlertCircle,
  XCircle,
  RefreshCw,
  Ban,
  ArrowRightLeft,
  Wallet,
  Search
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import Image from "next/image";

interface OrderItem {
  _id: string;
  grocery: {
    name: string;
    image?: { url: string };
    images?: Array<{ url: string }>;
    category?: string;
  } | null;
  groceryName?: string;
  variant: {
    variantId?: string;
    label: string;
    price: { selling: number };
  } | null;
  quantity: number;
  price: { sellingPrice: number; mrpPrice: number };
  substituteOption?: "none" | "similar" | "specific";
  substituteVariantId?: string | null;
  substituteName?: string;
  isSubstituted?: boolean;
  substituteStatus?: "pending" | "original_packed" | "substituted" | "out_of_stock_refunded" | "extra_amount_requested";
  substitutedWith?: {
    variantId?: string;
    label?: string;
    price?: number;
    name?: string;
  };
}

interface IOrder {
  _id: string;
  orderNumber?: string;
  createdAt: string;
  userId: {
    name: string;
    email: string;
    mobileNumber?: string;
  } | null;
  deliveryAddress: {
    fullName: string;
    mobile: string;
    city: string;
    state: string;
    pincode: string;
    fullAddress: string;
  };
  orderItems: OrderItem[];
  paymentMethod: "cod" | "online";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  orderStatus: "pending" | "confirmed" | "packed" | "shipped" | "out-for-delivery" | "delivered" | "cancelled";
  finalTotal: number;
  deliveryFee: number;
  savings: number;
}

export default function StoreManagerOrders() {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [packingItemId, setPackingItemId] = useState<string | null>(null);
  const [substituteSearch, setSubstituteSearch] = useState<Record<string, any[]>>({});
  const [searchingSubId, setSearchingSubId] = useState<string | null>(null);

  const tabs = [
    { id: "all", label: "All Orders" },
    { id: "pending", label: "Pending" },
    { id: "confirmed", label: "Confirmed" },
    { id: "packed", label: "Packed (Ready)" },
    { id: "shipped", label: "In Transit" },
    { id: "delivered", label: "Delivered" },
    { id: "cancelled", label: "Cancelled" },
  ];

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/store-manager/orders?status=${activeTab}`);
      setOrders(res.data.orders || []);
    } catch {
      toast.error("Failed to load store orders");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    setUpdatingId(orderId);
    try {
      await axios.put("/api/store-manager/orders", { orderId, status: nextStatus });
      toast.success(`Order status updated to ${nextStatus}`);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePackItem = async (orderId: string, orderItemId: string) => {
    setPackingItemId(orderItemId);
    try {
      await axios.post("/api/store-manager/orders/substitute", {
        orderId,
        orderItemId,
        action: "pack",
      });
      toast.success("Item packed successfully");
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to pack item");
    } finally {
      setPackingItemId(null);
    }
  };

  const handleOutOfStock = async (orderId: string, orderItemId: string, substituteVariantId?: string) => {
    setPackingItemId(orderItemId);
    try {
      await axios.post("/api/store-manager/orders/substitute", {
        orderId,
        orderItemId,
        action: "out_of_stock",
        substituteVariantId,
      });
      toast.success("Substitute action processed");
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to process substitute");
    } finally {
      setPackingItemId(null);
    }
  };

  const loadSubstitutes = async (orderItemId: string, categoryId: string) => {
    setSearchingSubId(orderItemId);
    try {
      const res = await axios.get(`/api/checkout/substitutes?categoryId=${categoryId}`);
      setSubstituteSearch((prev) => ({ ...prev, [orderItemId]: res.data.substitutes || [] }));
    } catch {
      toast.error("Failed to load substitutes");
    } finally {
      setSearchingSubId(null);
    }
  };

  const getSubStatusBadge = (item: OrderItem) => {
    const status = item.substituteStatus;
    if (!status || status === "pending") return null;
    const map: Record<string, { label: string; color: string }> = {
      original_packed: { label: "✓ Packed", color: "bg-green-50 text-green-700 border-green-200" },
      substituted: { label: "↔ Substituted", color: "bg-blue-50 text-blue-700 border-blue-200" },
      out_of_stock_refunded: { label: "↩ Refunded", color: "bg-amber-50 text-amber-700 border-amber-200" },
      extra_amount_requested: { label: "💰 Awaiting Customer", color: "bg-purple-50 text-purple-700 border-purple-200" },
    };
    const badge = map[status];
    if (!badge) return null;
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ShoppingBag className="w-7 h-7 text-green-600" />
          Fulfillment Orders
        </h1>
        <p className="text-sm text-slate-500">
          Monitor incoming grocery orders and update active tracking states.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 cursor-pointer ${
              activeTab === tab.id
                ? "border-green-600 text-green-600 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-3" />
          <p className="text-slate-500 text-sm">Loading store orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
          <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No Orders Found</h3>
          <p className="text-slate-500 text-sm mt-1">
            No orders match the selected category in your hyper-local store zone.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100"
            >
              {/* Left Details - Order metadata, Items */}
              <div className="p-6 flex-1 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Order: #{order.orderNumber || order._id.slice(-8).toUpperCase()}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Received: {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                      order.orderStatus === "pending"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : order.orderStatus === "confirmed"
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : order.orderStatus === "packed"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : order.orderStatus === "shipped" || order.orderStatus === "out-for-delivery"
                        ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                        : order.orderStatus === "delivered"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {order.orderStatus}
                  </span>
                </div>

                {/* Items List with Packing Actions */}
                <div className="space-y-3">
                  {order.orderItems.map((item) => (
                    <div key={item._id} className="border border-slate-100 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-3 text-xs">
                        <div className="relative w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                          {item.grocery?.image?.url ? (
                            <Image
                              src={item.grocery.image.url}
                              alt={item.grocery?.name || "Grocery"}
                              fill
                              sizes="40px"
                              className="object-contain p-0.5"
                            />
                          ) : item.grocery?.images?.[0]?.url ? (
                            <Image
                              src={item.grocery.images[0].url}
                              alt={item.grocery?.name || "Grocery"}
                              fill
                              sizes="40px"
                              className="object-contain p-0.5"
                            />
                          ) : (
                            <ShoppingBag className="w-4 h-4 text-slate-300 absolute inset-0 m-auto" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-700 truncate">
                            {item.grocery?.name || item.groceryName || "Deleted Grocery"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.variant?.label || "Unknown Variant"} | Qty: {item.quantity}
                          </p>
                          {/* Substitute preference badge */}
                          {item.substituteOption && item.substituteOption !== "none" && (
                            <p className="text-[10px] mt-0.5 font-semibold text-orange-600">
                              {item.substituteOption === "similar" ? "🔄 Wants: Similar Brand" : `📍 Wants: ${item.substituteName || "Specific item"}`}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="font-bold text-slate-800">
                            ₹{(item.price?.sellingPrice || 0) * item.quantity}
                          </p>
                          {getSubStatusBadge(item)}
                        </div>
                      </div>

                      {/* Substituted with info */}
                      {item.isSubstituted && item.substitutedWith?.name && (
                        <div className="text-[10px] bg-blue-50 text-blue-800 border border-blue-100 rounded-lg px-2.5 py-1.5 font-medium flex items-center gap-1.5">
                          <ArrowRightLeft className="w-3 h-3" />
                          Replaced with: <strong>{item.substitutedWith.name}</strong> (₹{item.substitutedWith.price})
                        </div>
                      )}

                      {/* Packing Actions — only show for confirmed orders with pending substitute status */}
                      {order.orderStatus === "confirmed" && (!item.substituteStatus || item.substituteStatus === "pending") && (
                        <div className="flex gap-2 pt-1">
                          <button
                            disabled={packingItemId === item._id}
                            onClick={() => handlePackItem(order._id, item._id)}
                            className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition disabled:opacity-50"
                          >
                            {packingItemId === item._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Pack
                          </button>
                          <button
                            disabled={packingItemId === item._id}
                            onClick={() => {
                              if (item.substituteOption === "none") {
                                handleOutOfStock(order._id, item._id);
                              } else if (item.substituteOption === "specific" && item.substituteVariantId) {
                                handleOutOfStock(order._id, item._id, item.substituteVariantId);
                              } else if (item.substituteOption === "similar" && item.grocery?.category) {
                                loadSubstitutes(item._id, item.grocery.category);
                              } else {
                                handleOutOfStock(order._id, item._id);
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold rounded-lg cursor-pointer transition disabled:opacity-50"
                          >
                            {packingItemId === item._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                            Out of Stock
                          </button>
                        </div>
                      )}

                      {/* Similar substitute search results */}
                      {substituteSearch[item._id] && item.substituteOption === "similar" && (!item.substituteStatus || item.substituteStatus === "pending") && (
                        <div className="mt-1 bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 space-y-2">
                          <p className="text-[10px] text-amber-700 font-bold uppercase">Pick a similar substitute:</p>
                          {substituteSearch[item._id].length === 0 ? (
                            <p className="text-[10px] text-slate-500">No substitutes available in this category.</p>
                          ) : (
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {substituteSearch[item._id]
                                .filter((s: any) => s.variantId !== item.variant?.variantId)
                                .map((sub: any) => (
                                <button
                                  key={sub.variantId}
                                  onClick={() => handleOutOfStock(order._id, item._id, sub.variantId)}
                                  className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white hover:bg-green-50 border border-slate-100 rounded-lg text-[10px] cursor-pointer transition"
                                >
                                  <span className="font-semibold text-slate-700 truncate">{sub.name}</span>
                                  <span className="font-bold text-green-700 flex-shrink-0">₹{sub.price}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Billing totals info */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <p>
                    Method: <strong className="text-slate-800 uppercase">{order.paymentMethod}</strong> (
                    <span className={order.paymentStatus === "paid" ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>
                      {order.paymentStatus}
                    </span>
                    )
                  </p>
                  <p className="text-sm font-extrabold text-slate-800">
                    Total: ₹{order.finalTotal}
                  </p>
                </div>
              </div>

              {/* Right Side - Actions & Address info */}
              <div className="p-6 md:w-80 flex-shrink-0 bg-slate-50/50 space-y-4">
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                    Delivery details
                  </h4>
                  <div className="space-y-1.5 text-slate-600">
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {order.deliveryAddress.fullName}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {order.deliveryAddress.mobile}
                    </p>
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span>{order.deliveryAddress.fullAddress}</span>
                    </p>
                  </div>
                </div>

                {/* Action Stepper Buttons */}
                <div className="pt-2">
                  {updatingId === order._id ? (
                    <div className="flex items-center justify-center p-2.5">
                      <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {order.orderStatus === "pending" && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, "confirmed")}
                          className="w-full flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition"
                        >
                          <Check className="w-4 h-4" />
                          Confirm Order
                        </button>
                      )}

                      {order.orderStatus === "confirmed" && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, "packed")}
                          className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition"
                        >
                          <PackageCheck className="w-4 h-4" />
                          Mark as Packed
                        </button>
                      )}

                      {order.orderStatus === "packed" && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, "shipped")}
                          className="w-full flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition"
                        >
                          <Truck className="w-4 h-4" />
                          Dispatch Order
                        </button>
                      )}

                      {order.orderStatus === "shipped" && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, "out-for-delivery")}
                          className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition"
                        >
                          <Truck className="w-4 h-4" />
                          Out for Delivery
                        </button>
                      )}

                      {order.orderStatus === "out-for-delivery" && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, "delivered")}
                          className="w-full flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition"
                        >
                          <Check className="w-4 h-4" />
                          Mark as Delivered
                        </button>
                      )}

                      {/* Cancel Order capability for unfulfilled */}
                      {["pending", "confirmed", "packed"].includes(order.orderStatus) && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, "cancelled")}
                          className="w-full flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer transition"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel Order
                        </button>
                      )}

                      {order.orderStatus === "delivered" && (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-green-700 font-semibold bg-green-50 border border-green-200 py-2.5 rounded-xl">
                          <Check className="w-4 h-4" />
                          Order Delivered
                        </div>
                      )}

                      {order.orderStatus === "cancelled" && (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-red-700 font-semibold bg-red-50 border border-red-200 py-2.5 rounded-xl">
                          <XCircle className="w-4 h-4" />
                          Order Cancelled
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
