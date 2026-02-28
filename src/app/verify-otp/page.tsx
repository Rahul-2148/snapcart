// src/app/verify-otp/page.tsx
"use client";

import React, { useState, Suspense, useEffect } from "react";
import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Loader2, Eye, EyeOff, Clock, RotateCw } from "lucide-react";
import AdvancedOTPInput from "@/components/common/AdvancedOTPInput";
import { toast } from "sonner";

function VerifyOTPContent() {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [otpTimer, setOtpTimer] = useState(600); // OTP validity: 10 minutes
  const [resendCooldown, setResendCooldown] = useState(60); // Initial cooldown: 60 seconds (can't resend immediately)
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  // OTP validity timer (10 minutes)
  useEffect(() => {
    if (submitted) return;

    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [submitted]);

  // Resend cooldown timer (60 seconds between resends)
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("/api/auth/verify-otp-reset", {
        email,
        otp,
        newPassword,
        confirmPassword,
      });

      if (response.data.success) {
        toast.success(
          "Password reset successful. Please login with your new password.",
        );
        setSubmitted(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch (err: any) {
      const status = err.response?.status;
      const errorMsg =
        err.response?.data?.message || "An error occurred. Please try again.";
      setError(errorMsg);
      if (status === 429) {
        // Lockout state: show subtle countdown when available
        const rem = err.response?.data?.lockTimeRemaining;
        const minutes = rem
          ? Math.ceil(rem / 60)
          : (errorMsg.match(/after\s(\d+)\sminute/)?.[1] ?? null);
        const text = minutes ? `🔒 Locked • ~${minutes}m remaining` : errorMsg;
        toast.error(text, { duration: 120000, closeButton: true });
      } else {
        toast.error(errorMsg);
      }

      // If locked, disable OTP input (optional UI lock can be added here)
    } finally {
      setLoading(false);
    }
  };

  // Handle resend OTP (calls different endpoint - no rate limit)
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return; // Prevent rapid resends

    setResending(true);
    setError("");

    try {
      const response = await axios.post("/api/auth/resend-otp", { email });

      if (response.data.success) {
        setResendCooldown(60); // 60 seconds cooldown between resends
        setOtp(""); // Clear OTP input
      }
    } catch (err: any) {
      const status = err.response?.status;
      const errorMsg =
        err.response?.data?.message || "Failed to resend OTP. Try again.";
      setError(errorMsg);
      if (status === 429) {
        const rem = err.response?.data?.lockTimeRemaining;
        const minutes = rem
          ? Math.ceil(rem / 60)
          : (errorMsg.match(/after\s(\d+)\sminute/)?.[1] ?? null);
        const text = minutes ? `🔒 Locked • ~${minutes}m remaining` : errorMsg;
        toast.error(text, { duration: 120000, closeButton: true });
      } else {
        toast.error(errorMsg);
      }
      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setError("");
      }, 5000);
    } finally {
      setResending(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="text-5xl mb-3"
            >
              ✅
            </motion.div>
            <h1 className="text-2xl font-bold text-white">Password Reset!</h1>
          </div>

          <div className="p-8 text-center space-y-4">
            <p className="text-gray-600">
              Your password has been successfully reset. Redirecting to login...
            </p>
            <div className="inline-block">
              <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            </div>
            <Link
              href="/login"
              className="inline-block mt-4 px-6 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
            >
              Go to Login →
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl mb-3"
          >
            🔑
          </motion.div>
          <h1 className="text-2xl font-bold text-white">Reset Your Password</h1>
          <p className="text-green-100 mt-2 text-sm">
            Enter the OTP and set a new password
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-500"
              />
            </div>

            {/* OTP Input */}
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-4">
                <span>Enter 6-digit OTP</span>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-4 h-4" />
                  <span
                    className={
                      otpTimer < 120
                        ? "text-red-500 font-semibold"
                        : "text-gray-600"
                    }
                  >
                    {Math.floor(otpTimer / 60)}:
                    {(otpTimer % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </label>
              <AdvancedOTPInput
                length={6}
                onComplete={setOtp}
                onValueChange={setOtp}
                error={error.includes("OTP") || error.includes("otp")}
                disabled={loading || otpTimer === 0}
              />
              <p className="text-xs text-gray-500 text-center mt-3">
                Enter the OTP sent to your email (valid for 10 minutes)
              </p>

              {/* Resend OTP Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-center"
              >
                {resendCooldown > 0 ? (
                  <p className="text-xs text-gray-500">
                    You can resend in{" "}
                    <span className="text-green-600 font-semibold">
                      {resendCooldown}s
                    </span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-green-500 text-green-600 hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-4 h-4" />
                        Resend OTP
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  placeholder="At least 8 characters"
                  className={`
                    w-full px-4 py-3 pr-10 rounded-lg border-2
                    transition-all duration-200 outline-none
                    ${
                      error && error.includes("password")
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-gray-50 focus:border-green-500 focus:bg-white"
                    }
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Re-enter your password"
                  className={`
                    w-full px-4 py-3 pr-10 rounded-lg border-2
                    transition-all duration-200 outline-none
                    ${
                      error && error.includes("match")
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-gray-50 focus:border-green-500 focus:bg-white"
                    }
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg p-4 border-l-4 ${
                  error.includes("locked") || error.includes("15 minute")
                    ? "bg-red-50 border-red-500"
                    : error.includes("attempt")
                      ? "bg-yellow-50 border-yellow-500"
                      : "bg-red-50 border-red-500"
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    error.includes("locked") || error.includes("15 minute")
                      ? "text-red-700"
                      : error.includes("attempt")
                        ? "text-yellow-700"
                        : "text-red-700"
                  }`}
                >
                  {error.includes("attempt") ? "⚠️" : "❌"} {error}
                </p>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2
                transition-all duration-200
                ${
                  loading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg hover:scale-105"
                }
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </button>

            {/* Back to Login */}
            <div className="text-center">
              <p className="text-gray-600 text-sm">
                Or use the reset link sent to your email
              </p>
            </div>

            {/* Security & Limit Info */}
            <div className="mt-8 space-y-3">
              {/* OTP Validity */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-700 text-xs font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  OTP is valid for 10 minutes
                </p>
              </div>

              {/* Attempt & Cooldown Info */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-2">
                <p className="text-amber-700 text-xs font-semibold">
                  ⚡ Important Limits:
                </p>
                <ul className="text-amber-600 text-xs space-y-1 ml-2">
                  <li>• 5 wrong OTP attempts = 15-minute account lockout</li>
                  <li>• Can resend OTP every 60 seconds</li>
                  <li>• If locked, wait before trying again</li>
                </ul>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <VerifyOTPContent />
    </Suspense>
  );
}
