// src/app/user/payment/stripe/[orderId]/page.tsx
"use client";

import { fetchCartApi } from "@/hooks/cart.api";
import { setCart } from "@/redux/features/cartSlice";
import { AppDispatch } from "@/redux/store";
import axios from "axios";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  IndianRupee,
  Loader2,
  Package,
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

interface OrderItem {
  _id: string;
  grocery: {
    images?: {
      url: string;
      publicId: string;
    }[];
  };
  groceryName: string;
  variant: {
    variantId: string;
    label: string;
    unit: string;
    value?: string;
  };
  price: {
    mrpPrice: number;
    sellingPrice: number;
  };
  quantity: number;
}

interface OrderData {
  _id: string;
  orderNumber: string;
  orderItems: OrderItem[];
  subTotal: number;
  deliveryFee: number;
  couponDiscount: number;
  finalTotal: number;
  deliveryAddress: any;
}

const StripePaymentPage = () => {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const orderId = params.orderId as string;

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const paymentInitiated = useRef(false);

  const handleGoBack = async () => {
    if (paymentInitiated.current) {
      router.back();
      return;
    }

    try {
      toast.loading("Cancelling order...");
      await axios.post("/api/order/cancel", { orderId });
      const cart = await fetchCartApi();
      dispatch(
        setCart({
          items: cart.items,
          cartId: cart.cartId,
          isGuest: cart.isGuest ?? false,
        })
      );
      toast.dismiss();
      toast.info("Order cancelled and cart restored.");
      router.back();
    } catch (error) {
      toast.dismiss();
      toast.error("Could not cancel order.");
      console.error("Failed to cancel order:", error);
      router.back();
    }
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await axios.get(
          `/api/order/fetch-order-details/${orderId}`
        );
        setOrderData(data);
      } catch (err) {
        console.error("Failed to fetch order data:", err);
        toast.error("Failed to load order details");
        router.push("/user/cart");
      }
      setLoading(false);
    };
    if (orderId) {
      fetchOrder();
    }
  }, [orderId, router, dispatch]);

  const handleStripePayment = async () => {
    if (!orderData) {
      toast.error("Order details are not loaded yet.");
      return;
    }

    setPaymentProcessing(true);
    paymentInitiated.current = true;

    try {
      const { data } = await axios.post("/api/payment/stripe", {
        orderId,
      });

      if (data.session && data.session.url) {
        window.location.href = data.session.url;
      } else {
        throw new Error("Could not retrieve a valid payment session.");
      }
    } catch (error: any) {
      console.error("Stripe payment error:", error);
      toast.error(
        error.response?.data?.message || "Failed to initiate payment"
      );
      setPaymentProcessing(false);
      paymentInitiated.current = false;
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="w-[90%] mx-auto mt-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
        <button
          onClick={() => router.push("/user/cart")}
          className="text-green-600 hover:text-green-700 font-medium"
        >
          Return to cart
        </button>
      </div>
    );
  }

  return (
    <div className="w-[95%] sm:w-[90%] md:w-[85%] mx-auto py-10">
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleGoBack}
        className="flex items-center gap-2 text-green-700 hover:text-green-800 font-semibold mb-8 cursor-pointer"
      >
        <ArrowLeft size={18} />
        <span>Back</span>
      </motion.button>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl md:text-4xl font-bold text-green-700 text-center mb-10"
      >
        Complete Your Payment
      </motion.h1>

      <div className="grid md:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Order Items ({orderData.orderItems.length})
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {orderData.orderItems.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 transition-all"
              >
                <div className="w-20 h-20 flex-shrink-0 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                  {item.grocery?.images?.[0]?.url ? (
                    <Image
                      src={item.grocery.images[0].url}
                      alt={item.groceryName}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">
                    {item.groceryName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {item.variant.label}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-lg font-bold text-green-700">
                      ₹{Math.round(item.price.sellingPrice)}
                    </span>
                    {item.price.mrpPrice > item.price.sellingPrice && (
                      <>
                        <span className="text-sm line-through text-gray-400">
                          ₹{Math.round(item.price.mrpPrice)}
                        </span>
                        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                          {Math.round(
                            ((item.price.mrpPrice - item.price.sellingPrice) /
                              item.price.mrpPrice) *
                              100
                          )}
                          % OFF
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-700">
                    ×{item.quantity}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    ₹{Math.round(item.price.sellingPrice * item.quantity)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">
              Delivery Address
            </h3>
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700 border border-blue-200">
              <p className="font-medium">
                {orderData.deliveryAddress.fullName}
              </p>
              <p className="text-gray-600 mt-1">
                {orderData.deliveryAddress.fullAddress}
              </p>
              <p className="text-gray-600">
                {orderData.deliveryAddress.city},{" "}
                {orderData.deliveryAddress.state}{" "}
                {orderData.deliveryAddress.pincode}
              </p>
              <p className="text-gray-600 mt-1">
                {orderData.deliveryAddress.mobile}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 h-fit sticky top-24"
        >
          <>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Order Summary
            </h2>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">
                  ₹{orderData.subTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span
                  className={
                    orderData.deliveryFee === 0 ? "text-green-600" : ""
                  }
                >
                  {orderData.deliveryFee === 0
                    ? "FREE"
                    : `₹${orderData.deliveryFee.toFixed(2)}`}
                </span>
              </div>
              {orderData.couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon Discount</span>
                  <span className="font-medium">
                    -₹{orderData.couponDiscount.toFixed(2)}
                  </span>
                </div>
              )}
              <hr className="my-3 border-gray-200" />
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Total Amount</span>
                <span className="text-green-700">
                  ₹{orderData.finalTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleStripePayment}
              disabled={paymentProcessing}
              className="w-full text-white py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition-all bg-blue-600 hover:bg-blue-700"
            >
              {paymentProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <IndianRupee size={18} />
                  Pay ₹{orderData.finalTotal.toFixed(2)} with Stripe
                </>
              )}
            </motion.button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Secure payment powered by Stripe
            </p>
          </>
        </motion.div>
      </div>
    </div>
  );
};

export default StripePaymentPage;
