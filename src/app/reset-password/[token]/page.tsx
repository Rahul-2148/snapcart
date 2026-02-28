// src/app/reset-password/[token]/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { motion } from "motion/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState("");
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await axios.get(
          `/api/auth/verify-reset-token?token=${token}`
        );

        if (response.data.success) {
          setTokenValid(true);
          setEmail(response.data.email);
        }
      } catch (err) {
        setError("This reset link is invalid or has expired. Please request a new one.");
        toast.error("This reset link is invalid or has expired. Please request a new one.");
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
      const response = await axios.post("/api/auth/verify-reset-token", {
        token,
        newPassword,
        confirmPassword,
      });

      if (response.data.success) {
        toast.success("Password reset successful. Please login with your new password.");
        setSubmitted(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred. Please try again.");
        toast.error(err.response?.data?.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Loading State
  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Verifying your reset link...</p>
        </motion.div>
      </div>
    );
  }

  // Invalid Token
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="text-4xl mb-3"
            >
              ❌
            </motion.div>
            <h1 className="text-2xl font-bold text-white">Link Expired</h1>
          </div>

          <div className="p-8 text-center space-y-4">
            <p className="text-gray-600">{error}</p>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded text-left">
              <p className="text-yellow-700 text-sm">
                💡 Request a new password reset link by clicking the "Forgot Password" button on the login page.
              </p>
            </div>

            <Link
              href="/forgot-password"
              className="inline-block mt-4 px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
            >
              Request New Reset Link
            </Link>

            <Link
              href="/login"
              className="block text-green-600 hover:underline text-sm font-medium"
            >
              Back to Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success State
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
              Your password has been successfully reset!
            </p>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded space-y-2">
              <p className="text-green-700 font-semibold text-sm">✓ You can now login with:</p>
              <ul className="text-green-600 text-xs space-y-1">
                <li>📧 Email: {email}</li>
                <li>🔐 Your new password</li>
              </ul>
            </div>

            <div className="inline-block">
              <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            </div>

            <p className="text-gray-500 text-sm">
              Redirecting to login in 3 seconds...
            </p>

            <Link
              href="/login"
              className="inline-block mt-4 px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
            >
              Go to Login →
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Reset Form
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
            🔐
          </motion.div>
          <h1 className="text-2xl font-bold text-white">Reset Your Password</h1>
          <p className="text-green-100 mt-2 text-sm">Create a new secure password</p>
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

            {/* Password Strength Indicator */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-700 text-xs font-semibold mb-2">
                🔒 Password Requirements:
              </p>
              <ul className="text-blue-600 text-xs space-y-1">
                <li
                  className={
                    newPassword.length >= 8 ? "text-green-600" : ""
                  }
                >
                  {newPassword.length >= 8 ? "✓" : "○"} At least 8 characters
                </li>
                <li
                  className={
                    /[A-Z]/.test(newPassword) ? "text-green-600" : ""
                  }
                >
                  {/[A-Z]/.test(newPassword) ? "✓" : "○"} One uppercase letter
                </li>
                <li
                  className={
                    /[a-z]/.test(newPassword) ? "text-green-600" : ""
                  }
                >
                  {/[a-z]/.test(newPassword) ? "✓" : "○"} One lowercase letter
                </li>
                <li
                  className={
                    /[0-9]/.test(newPassword) ? "text-green-600" : ""
                  }
                >
                  {/[0-9]/.test(newPassword) ? "✓" : "○"} One number
                </li>
              </ul>
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
                  placeholder="Enter your new password"
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
                className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">{error}</p>
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
              <Link
                href="/login"
                className="text-green-600 hover:underline text-sm font-medium"
              >
                Back to Login
              </Link>
            </div>
          </form>

          {/* Security Notes */}
          <div className="mt-8 space-y-3">
            {/* Link Validity */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-700 text-xs font-medium">
                🔗 This reset link is valid for 24 hours
              </p>
            </div>

            {/* Security Tips */}
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-2">
              <p className="text-amber-700 text-xs font-semibold">⚡ Security Tips:</p>
              <ul className="text-amber-600 text-xs space-y-1 ml-2">
                <li>• Use a strong, unique password</li>
                <li>• Don't share your password with anyone</li>
                <li>• After reset, login with your new password</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
