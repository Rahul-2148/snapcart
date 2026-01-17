
// src/app/user/payment/cancel/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { toast } from "sonner";

const PaymentCancelPage = () => {
  const router = useRouter();

  useEffect(() => {
    toast.error("Payment was cancelled. You can try again from your cart.");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 md:p-12 rounded-2xl shadow-xl text-center max-w-lg w-full"
      >
        <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          Payment Cancelled
        </h1>
        <p className="text-gray-600 mb-8">
          Your payment was not completed. Your cart has been saved, and you can
          attempt to purchase again at any time.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/user/cart")}
            className="bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-2 mx-auto sm:mx-0 transition-colors hover:bg-gray-300"
          >
            <ArrowLeft size={20} />
            <span>Return to Cart</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/")}
            className="bg-green-600 text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-2 mx-auto sm:mx-0 transition-colors hover:bg-green-700"
          >
            Continue Shopping
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentCancelPage;
