
// src/app/user/payment/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { clearCart } from "@/redux/features/cartSlice";
import axios from "axios";

const PaymentSuccessPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "idle"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!sessionId) {
      toast.error("Invalid session. Redirecting to home.");
      router.push("/");
      return;
    }

    const verifyPayment = async () => {
      setStatus("loading");
      try {
        await axios.post("/api/payment/stripe-verify", { sessionId });
        toast.success("Payment successful! Your order is confirmed.");
        dispatch(clearCart());
        setStatus("success");
      } catch (error: any) {
        const message =
          error.response?.data?.message ||
          "Failed to verify payment. Please contact support.";
        setErrorMessage(message);
        toast.error(message);
        setStatus("error");
        console.error("Payment verification failed:", error);
      }
    };

    verifyPayment();
  }, [sessionId, router, dispatch]);

  const getStatusContent = () => {
    switch (status) {
      case "loading":
        return {
          icon: <Loader2 className="w-20 h-20 text-blue-500 mx-auto mb-6 animate-spin" />,
          title: "Verifying Payment...",
          message: "Please wait while we confirm your payment with the provider. Do not close this page.",
        };
      case "error":
        return {
          icon: <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-6" />,
          title: "Verification Failed",
          message: errorMessage,
        };
      case "success":
      default:
        return {
          icon: <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />,
          title: "Payment Successful!",
          message: "Your order is confirmed and will be processed shortly. You will receive a confirmation email soon.",
        };
    }
  };

  const { icon, title, message } = getStatusContent();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 md:p-12 rounded-2xl shadow-xl text-center max-w-lg w-full"
      >
        {icon}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          {title}
        </h1>
        <p className="text-gray-600 mb-8">{message}</p>
        
        {status !== 'loading' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(status === 'error' ? '/user/cart' : '/user/orders')}
            className="bg-green-600 text-white font-semibold py-3 px-8 rounded-full flex items-center justify-center gap-2 mx-auto transition-colors hover:bg-green-700"
          >
            <span>{status === 'error' ? 'Return to Cart' : 'View Your Orders'}</span>
            <ArrowRight size={20} />
          </motion.button>
        )}

        <p className="text-sm text-gray-400 mt-6">
          Session ID: {sessionId ? `${sessionId.slice(0, 20)}...` : "N/A"}
        </p>
      </motion.div>
    </div>
  );
};

export default PaymentSuccessPage;
