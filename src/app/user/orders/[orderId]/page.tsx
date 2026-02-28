"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Package, Download, Loader2, RotateCw, CheckCircle2, Clock, Truck, AlertCircle } from "lucide-react";
import TimelineStepper from "@/components/TimelineStepper";
import { useSnackbar } from "notistack";
import { ReturnRequestForm } from "@/components/ReturnRequestForm";
import { useSocket } from "@/contexts/SocketContext";

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
    _id?: string;
  };
  image?: string;
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
  codHandlingCharge?: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  onlinePaymentType?: string;
  paymentDetails?: Array<{
    provider?: string;
    paymentMethod?: string;
    status?: string;
  }>;
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

type ReturnInfo = {
  canReturn: boolean;
  allowedTypes: ("return" | "replacement")[];
  reason?: string;
  daysRemaining?: number;
  returnWindowDays?: number;
  existingReturnId?: string;
  existingReturnStatus?: string;
  returnData?: {
    requestType: "return" | "replacement";
    requestedAt: string;
    approvedAt?: string;
    pickedUpAt?: string;
    receivedAt?: string;
    completedAt?: string;
    refund?: { amount: number; method: string; completedAt?: string };
    replacement?: { quantity: number; shippedAt?: string; deliveredAt?: string };
  };
};

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
  const [orderLoading, setOrderLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [showReturnForm, setShowReturnForm] = useState<string | null>(null);
  const router = useRouter();
  const [returnInfo, setReturnInfo] = useState<Record<string, ReturnInfo>>({});
  const [returnHighlight, setReturnHighlight] = useState<
    | {
        label: string;
        windowText?: string;
      }
    | null
  >(null);
  const socket = useSocket();

  const renderReturnTimeline = (itemId: string) => {
    const info = returnInfo[itemId];
    if (!info?.existingReturnId || !info?.returnData) return null;

    const data = info.returnData;
    const steps = [
      { label: "Requested", date: data.requestedAt, icon: Clock },
      { label: "Approved", date: data.approvedAt, icon: CheckCircle2 },
      { label: "Picked Up", date: data.pickedUpAt, icon: Truck },
      { label: "Received", date: data.receivedAt, icon: CheckCircle2 },
      { label: "Completed", date: data.completedAt, icon: CheckCircle2 },
    ];

    return (
      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-sm font-semibold text-blue-900 mb-3">
          {data.requestType === "return" ? "Return" : "Replacement"} Progress
        </p>
        <div className="space-y-2">
          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = !!step.date;
            return (
              <div key={step.label} className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isCompleted ? "bg-blue-600" : "bg-gray-300"}`}>
                  <Icon className="w-3 h-3 text-white" />
                </div>
                <span className={`text-sm ${isCompleted ? "text-blue-900 font-medium" : "text-gray-500"}`}>
                  {step.label}
                </span>
                {step.date && (
                  <span className="text-xs text-gray-600 ml-auto">
                    {new Date(step.date).toLocaleDateString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {data.refund && (
          <div className="mt-3 pt-3 border-t border-blue-200 text-sm">
            <div className="text-green-700 font-medium flex items-center gap-1 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              Refund Processed ✓
            </div>
            <p className="text-gray-700">Amount: <strong>₹{data.refund.amount}</strong></p>
            <p className="text-gray-700">Method: <strong>{data.refund.method === "original-payment" ? "Original Payment Method" : data.refund.method}</strong></p>
            {data.refund.transactionId && data.refund.transactionId !== "REFUND_PROCESSING" && (
              <p className="text-gray-600 text-xs mt-1">
                Transaction ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{data.refund.transactionId}</span>
              </p>
            )}
            {data.refund.completedAt && (
              <p className="text-xs text-gray-600 mt-1">
                Processed on {new Date(data.refund.completedAt).toLocaleDateString("en-IN")} at {new Date(data.refund.completedAt).toLocaleTimeString("en-IN")}
              </p>
            )}
            {data.refund.transactionId === "REFUND_PROCESSING" && (
              <p className="text-xs text-amber-600 mt-1">
                ⏳ Refund is being processed. Check your bank account within 3-5 business days.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderReturnNote = (itemId: string) => {
    const info = returnInfo[itemId];
    if (!info) return null;

    // Show negative reason only if return is NOT possible
    if (!info.canReturn && info.reason) {
      return (
        <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {info.reason}
        </div>
      );
    }

    // Show allowed types and remaining days if return IS possible
    if (info.canReturn && info.allowedTypes.length > 0) {
      const typesText = info.allowedTypes.length === 1
        ? info.allowedTypes[0] === "return" ? "Return & Refund" : "Replacement"
        : "Return or Replacement";
      
      const daysText = info.daysRemaining !== undefined && info.returnWindowDays
        ? `${Math.max(0, info.daysRemaining)} of ${info.returnWindowDays} days`
        : "";

      return (
        <div className="mt-2 text-xs text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {typesText} {daysText && `• ${daysText}`}
        </div>
      );
    }

    return null;
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      fetchTimeline();
    }
  }, [orderId]);

  useEffect(() => {
    if (order?.orderItems) {
      checkReturnability();
    }
  }, [order]);

  // Listen for real-time return status updates
  useEffect(() => {
    if (!socket) return;

    const handleReturnStatusChange = async (data: any) => {
      // Refresh return details for this order
      await checkReturnability();
    };

    socket.on("return:status-changed", handleReturnStatusChange);
    socket.on("return:updated", handleReturnStatusChange);
    socket.on("return:created", handleReturnStatusChange);

    return () => {
      socket.off("return:status-changed", handleReturnStatusChange);
      socket.off("return:updated", handleReturnStatusChange);
      socket.off("return:created", handleReturnStatusChange);
    };
  }, [socket]);

  const fetchOrderDetails = async () => {
    setOrderLoading(true);
    try {
      const res = await fetch(`/api/order/fetch-order-details/${orderId}`);
      if (!res.ok) throw new Error("Failed to fetch order details");
      const data = await res.json();
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOrderLoading(false);
    }
  };

  const fetchTimeline = async () => {
    setTimelineLoading(true);
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
      setTimelineLoading(false);
    }
  };

  const handleCancelReturn = async (returnId: string) => {
    try {
      const res = await fetch(`/api/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel return");
      }

      await checkReturnability();
      enqueueSnackbar("Return cancelled", { variant: "success" });
    } catch (err: any) {
      enqueueSnackbar(err.message || "Failed to cancel return", { variant: "error" });
    }
  };

  const fetchReturnDetails = async (returnId: string): Promise<ReturnInfo["returnData"] | null> => {
    try {
      const res = await fetch(`/api/returns/${returnId}`);
      if (res.ok) {
        const data = await res.json();
        return {
          requestType: data.requestType,
          requestedAt: data.requestedAt,
          approvedAt: data.approvedAt,
          pickedUpAt: data.pickedUpAt,
          receivedAt: data.receivedAt,
          completedAt: data.completedAt,
          refund: data.refund,
          replacement: data.replacement,
        };
      }
    } catch (err) {
      console.error("Error fetching return details:", err);
    }
    return null;
  };

  const createFallbackTimeline = () => {
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
        completed:
          order?.orderStatus === "confirmed" ||
          ["packed", "shipped", "out-for-delivery", "delivered"].includes(
            order?.orderStatus || ""
          ),
      },
      {
        status: "packed",
        label: "Packed",
        time: undefined,
        completed: [
          "packed",
          "shipped",
          "out-for-delivery",
          "delivered",
        ].includes(order?.orderStatus || ""),
      },
      {
        status: "shipped",
        label: "Shipped",
        time: undefined,
        completed: ["shipped", "out-for-delivery", "delivered"].includes(
          order?.orderStatus || ""
        ),
      },
      {
        status: "out-for-delivery",
        label: "Out for Delivery",
        time: undefined,
        completed: ["out-for-delivery", "delivered"].includes(
          order?.orderStatus || ""
        ),
      },
      {
        status: "delivered",
        label: "Delivered",
        time: undefined,
        completed: order?.orderStatus === "delivered",
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

  const getPaymentProvider = (orderData: Order) => {
    if (orderData.paymentMethod === "online") {
      return (
        orderData.onlinePaymentType || orderData.paymentDetails?.[0]?.provider || orderData.paymentDetails?.[0]?.paymentMethod
      );
    }
    return null;
  };

  const getPrimaryPayment = (orderData: Order) => {
    if (!orderData.paymentDetails || orderData.paymentDetails.length === 0) return null;
    return orderData.paymentDetails[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const checkReturnability = async () => {
    if (!order?.orderItems?.length) return;

    const results: Record<string, ReturnInfo> = {};

    await Promise.all(
      order.orderItems.map(async (item: any) => {
        const groceryId =
          item?.grocery?._id || item?.grocery?.id || item?.grocery || item?.groceryId;

        if (!groceryId) {
          results[item._id] = {
            canReturn: false,
            allowedTypes: [],
            reason: "Missing grocery id",
          };
          return;
        }

        try {
          const params = new URLSearchParams({
            orderId: String(orderId),
            orderItemId: item._id,
            groceryId: String(groceryId),
          });

          const res = await fetch(`/api/returns/check-eligibility?${params.toString()}`);

          if (res.ok) {
            const data = await res.json();
            const policyType = data.policy?.policyType as
              | "return-only"
              | "replacement-only"
              | "both"
              | "none"
              | undefined;

            const allowedTypes: ("return" | "replacement")[] =
              policyType === "return-only"
                ? ["return"]
                : policyType === "replacement-only"
                  ? ["replacement"]
                  : policyType === "both"
                    ? ["return", "replacement"]
                    : [];

            results[item._id] = {
              canReturn: Boolean(data.canReturn),
              allowedTypes,
              reason: data.reason,
              daysRemaining: data.daysRemaining,
              returnWindowDays: data.policy?.returnWindowDays,
              existingReturnId: data.existingReturnId,
              existingReturnStatus: data.existingReturnStatus,
              returnData: await (data.existingReturnId ? fetchReturnDetails(data.existingReturnId) : Promise.resolve(undefined)),
            };
          } else {
            results[item._id] = {
              canReturn: false,
              allowedTypes: [],
              reason: "Not eligible",
            };
          }
        } catch (err) {
          results[item._id] = {
            canReturn: false,
            allowedTypes: [],
            reason: "Not eligible",
          };
        }
      }),
    );

    setReturnInfo(results);

    // choose a highlight message for the page header (first eligible item)
    const firstEligible = Object.values(results).find((r) => r.canReturn);
    if (firstEligible) {
      const label =
        firstEligible.allowedTypes.length === 1
          ? firstEligible.allowedTypes[0] === "return"
            ? "Return & Refund available"
            : "Replacement available"
          : "Return or Replacement available";

      const daysLeft = firstEligible.daysRemaining ?? null;
      const windowDays = firstEligible.returnWindowDays ?? null;
      const windowText =
        daysLeft !== null && windowDays !== null
          ? `${Math.max(0, daysLeft)} of ${windowDays} days left`
          : undefined;

      setReturnHighlight({ label, windowText });
    } else {
      setReturnHighlight(null);
    }
  };

  const handleDownloadBill = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/order/download-bill/${orderId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to download bill");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.click();
      enqueueSnackbar("Bill opened in new tab!", { variant: "success" });
    } catch (error: any) {
      enqueueSnackbar(
        error.message || "Failed to download bill. Please try again.",
        { variant: "error" }
      );
    } finally {
      setDownloading(false);
    }
  };

  if (orderLoading || timelineLoading) {
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
            href="/user/orders"
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
            href="/user/orders"
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
              {returnHighlight && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-amber-50 text-amber-800 px-3 py-2 text-sm border border-amber-100">
                  <RotateCw className="w-4 h-4" />
                  <span>
                    {returnHighlight.label}
                    {returnHighlight.windowText ? ` • ${returnHighlight.windowText}` : ""}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4 sm:mt-0 flex items-center gap-4">
              <span
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                  order.orderStatus
                )}`}
              >
                {order.orderStatus.replace("-", " ").toUpperCase()}
              </span>
              <button
                onClick={handleDownloadBill}
                disabled={downloading || Object.values(returnInfo).some(info => info.returnData?.completedAt)}
                title={Object.values(returnInfo).some(info => info.returnData?.completedAt) ? "Cannot download bill for orders with completed returns" : ""}
                className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  order.orderStatus === "delivered" && !Object.values(returnInfo).some(info => info.returnData?.completedAt)
                    ? downloading
                      ? "bg-green-500 text-white cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                }`}
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {downloading ? "Downloading..." : "Download Bill"}
              </button>
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
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Items</h2>
              <div className="space-y-4">
                {order?.orderItems?.map((item: any) => (
                  <div key={item._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {(() => {
                          const imgSrc = item.image || item?.grocery?.images?.[0]?.url;
                          if (imgSrc) {
                            return (
                              <Image
                                src={imgSrc}
                                alt={item.grocery?.name || item.groceryName}
                                width={80}
                                height={80}
                                className="rounded-lg object-cover"
                              />
                            );
                          }
                          return (
                            <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                          );
                        })()}
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
                      <div className="text-right flex flex-col items-end gap-2">
                        <div>
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
                        {order.orderStatus === "delivered" && returnInfo[item._id]?.canReturn && !returnInfo[item._id]?.existingReturnId && (
                          <button
                            onClick={() => setShowReturnForm(item._id)}
                            className="inline-flex items-center px-3 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 text-xs font-medium transition-colors"
                          >
                            <RotateCw className="w-3 h-3 mr-1" />
                            Return
                          </button>
                        )}
                        {returnInfo[item._id]?.existingReturnId && (
                          <div className="flex items-center gap-2 text-xs text-blue-700 mt-1">
                            <span className="px-2 py-1 rounded bg-blue-50 border border-blue-100">
                              Return {returnInfo[item._id]?.existingReturnStatus || "in-progress"}
                            </span>
                            {returnInfo[item._id]?.existingReturnStatus === "pending" && (
                              <button
                                onClick={() => handleCancelReturn(returnInfo[item._id]!.existingReturnId!)}
                                className="text-red-600 hover:text-red-700 underline"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                        {renderReturnTimeline(item._id)}
                        {renderReturnNote(item._id)}
                      </div>
                    </div>
                    {showReturnForm === item._id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <ReturnRequestForm
                          orderId={String(orderId)}
                          orderItemId={item._id}
                          groceryName={item.groceryName}
                          allowedRequestTypes={
                            returnInfo[item._id]?.allowedTypes?.length
                              ? returnInfo[item._id].allowedTypes
                              : ["return"]
                          }
                          onSuccess={() => {
                            setShowReturnForm(null);
                            enqueueSnackbar("Return request submitted successfully!", { variant: "success" });
                            setReturnInfo((prev) => ({
                              ...prev,
                              [item._id]: {
                                canReturn: false,
                                allowedTypes: [],
                                reason: "A return/replacement request is already in progress",
                              },
                            }));
                            router.push("/user/orders");
                          }}
                          onCancel={() => setShowReturnForm(null)}
                        />
                      </div>
                    )}
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
                    {Number(order.deliveryFee || 0) === 0
                      ? "Free"
                      : `${order.currency} ${Number(order.deliveryFee).toFixed(2)}`}
                  </span>
                </div>

                {Number(order.codHandlingCharge || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">COD Handling Charge</span>
                    <span className="font-medium">
                      +{order.currency} {Number(order.codHandlingCharge).toFixed(2)}
                    </span>
                  </div>
                )}

                {Number(order.couponDiscount || 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span className="font-medium">
                      -{order.currency} {Number(order.couponDiscount).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Savings</span>
                  <span className="font-medium text-green-600">
                    -{order.currency} {Number(order.savings || 0).toFixed(2)}
                  </span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>
                      {order.currency} {Number(order.finalTotal || 0).toFixed(2)}
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
                  <p className="text-gray-600 capitalize flex items-center gap-2">
                    <span>{order.paymentMethod}</span>
                    {order.paymentMethod === "online" && getPaymentProvider(order) && (
                      <span className="text-xs text-gray-500">(
                        {getPaymentProvider(order)}
                      )</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">
                    Status: {order.paymentStatus}
                  </p>
                  {order.paymentMethod === "online" && getPrimaryPayment(order) && (
                    <div className="text-xs text-gray-500 mt-1 space-y-1">
                      {getPrimaryPayment(order)?.transactionId && (
                        <p>Txn ID: {getPrimaryPayment(order)?.transactionId}</p>
                      )}
                      {getPrimaryPayment(order)?.status && (
                        <p>Gateway Status: {getPrimaryPayment(order)?.status}</p>
                      )}
                    </div>
                  )}
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
