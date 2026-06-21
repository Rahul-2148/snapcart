"use client";

import { useState } from "react";
import AdvancedOTPInput from "@/components/common/AdvancedOTPInput";

interface OTPVerificationProps {
  assignmentId: string;
  orderNumber: string;
  onVerified?: () => void;
}

export function OTPVerification({
  assignmentId,
  orderNumber,
  onVerified,
}: OTPVerificationProps) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [generatingOtp, setGeneratingOtp] = useState(false);

  const handleGenerateOTP = async () => {
    try {
      setGeneratingOtp(true);
      setError("");
      const res = await fetch("/api/delivery-boy/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate",
          assignmentId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowOtpInput(true);
        // Note: In production, don't display OTP to partner
        console.log("OTP generated (check SMS/email sent to customer)");
      } else {
        setError(data.error || "Failed to generate OTP");
      }
    } catch (err) {
      setError("Error generating OTP");
    } finally {
      setGeneratingOtp(false);
    }
  };

  const handleVerifyOTP = async (otpToVerify?: string) => {
    const otpValue = otpToVerify || otp;
    if (otpValue.length !== 4) {
      setError("Please enter a valid 4-digit OTP");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/delivery-boy/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "verify",
          assignmentId,
          otp: otpValue,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setOtp("");
        onVerified?.();
      } else {
        setError(data.error || "OTP verification failed");
      }
    } catch (err) {
      setError("Error verifying OTP");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <p className="text-green-700 font-medium text-lg">
          ✓ Delivery Verified!
        </p>
        <p className="text-green-600 text-sm mt-1">
          Order {orderNumber} successfully delivered.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Complete Delivery
      </h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!showOtpInput ? (
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Click below to generate an OTP that the customer will enter to
            verify delivery.
          </p>
          <button
            onClick={handleGenerateOTP}
            disabled={generatingOtp}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {generatingOtp ? "Generating..." : "Generate OTP"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter OTP from Customer
          </label>
          <AdvancedOTPInput
            length={4}
            onComplete={(code) => {
              setOtp(code);
              // Auto-verify when all 4 digits are entered
              handleVerifyOTP(code);
            }}
            onValueChange={(code) => setOtp(code)}
            error={!!error}
            disabled={loading}
          />
          <p className="text-xs text-gray-600 mt-2 text-center">
            Ask customer to read the OTP sent to their phone
          </p>

          <button
            type="button"
            onClick={() => handleVerifyOTP()}
            disabled={loading || otp.length !== 4}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowOtpInput(false);
              setOtp("");
            }}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
