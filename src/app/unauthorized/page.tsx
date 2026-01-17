"use client";

import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-red-50 to-white p-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white shadow-xl rounded-2xl p-10 max-w-md w-full text-center border border-red-100"
      >
        {/* Icon with animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 150 }}
          className="flex justify-center"
        >
          <ShieldAlert className="text-red-600 w-16 h-16" />
        </motion.div>

        <h1 className="mt-4 text-3xl font-extrabold text-red-600">
          Access Denied
        </h1>
        <p className="mt-3 text-gray-600 text-lg">
          You don't have permission to view this page.
        </p>

        {/* Fade-in animation for button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <a
            href="/"
            className="inline-block mt-6 px-6 py-3 rounded-xl bg-red-600 text-white font-semibold shadow-md hover:bg-red-700 transition-all"
          >
            Go Back Home
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Unauthorized;
