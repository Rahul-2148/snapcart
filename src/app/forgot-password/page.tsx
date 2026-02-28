// src/app/forgot-password/page.tsx
"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post("/api/auth/forgot-password", { email });

      if (response.data.success) {
        toast.success("Email sent! Check for OTP and reset link.");
        setSubmitted(true);
        // Redirect to OTP verification after 3 seconds
        setTimeout(() => {
          router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
        }, 3000);
      }
    } catch (err: any) {
        const status = err.response?.status;
        const msg = err.response?.data?.message || "An error occurred. Please try again.";
        setError(msg);
        if (status === 429) {
          // Email rate limit: show softer warning with remaining minutes when available
          const rem = err.response?.data?.remainingTime;
          const minutes = rem ? Math.ceil(rem / 60) : (msg.match(/wait\s(\d+)/)?.[1] ?? null);
          const text = minutes ? `⏱️ Rate limited • ~${minutes}m remaining` : msg;
        toast.warning(text, { duration: 5000, closeButton: true });
        } else {
          toast.error(msg);
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {!submitted ? (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
                className="text-4xl mb-3"
              >
                🔐
              </motion.div>
              <h1 className="text-2xl font-bold text-white">Forgot Password?</h1>
              <p className="text-green-100 mt-2 text-sm">
                Don't worry, we'll help you reset it!
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Enter your email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                      placeholder="you@example.com"
                      className={`
                        w-full pl-10 pr-4 py-3 rounded-lg border-2 
                        transition-all duration-200 outline-none
                        ${
                          error
                            ? "border-red-300 bg-red-50"
                            : "border-gray-200 bg-gray-50 focus:border-green-500 focus:bg-white"
                        }
                        ${loading ? "bg-gray-100" : ""}
                      `}
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border-l-4 border-red-500 p-4 rounded"
                  >
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className={`
                    w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2
                    transition-all duration-200
                    ${
                      loading || !email
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg hover:scale-105"
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Send Reset Link
                    </>
                  )}
                </button>

                <div className="text-center">
                  <p className="text-gray-600 text-sm">
                    Remember your password?{" "}
                    <Link href="/login" className="text-green-600 font-semibold hover:underline">
                      Back to login
                    </Link>
                  </p>
                </div>
              </form>

              {/* Info */}
              <div className="mt-8 space-y-3">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-700 text-xs font-medium">
                    ℹ️ We'll send you an OTP and a reset link via email. Choose the method you prefer
                    to reset your password.
                  </p>
                </div>

                {/* Rate Limit Info */}
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-amber-700 text-xs font-medium">
                    ⏱️ Can request once every 2 minutes per email address
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Success */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="text-5xl mb-3"
              >
                ✅
              </motion.div>
              <h1 className="text-2xl font-bold text-white">Check Your Email!</h1>
            </div>

            <div className="p-8 text-center space-y-4">
              <p className="text-gray-600">
                We've sent password reset instructions to{" "}
                <span className="font-semibold text-gray-800">{email}</span>
              </p>

              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded text-left space-y-2">
                <p className="text-green-700 font-semibold text-sm">📧 You'll receive:</p>
                <ul className="text-green-600 text-xs space-y-1">
                  <li>✓ A 6-digit OTP (valid for 10 minutes)</li>
                  <li>✓ A reset link (valid for 24 hours)</li>
                </ul>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-blue-700 text-sm">
                  🔍 Check your spam folder if you don't see the email in a few minutes.
                </p>
              </div>

              <p className="text-gray-500 text-sm">
                Redirecting to verification page in 3 seconds...
              </p>

              <Link
                href={`/verify-otp?email=${encodeURIComponent(email)}`}
                className="inline-block mt-4 px-6 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
              >
                Go to OTP Verification →
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
