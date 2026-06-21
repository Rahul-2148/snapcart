// src/components/common/AdvancedOTPInput.tsx
"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Smartphone } from "lucide-react";

interface AdvancedOTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  onValueChange?: (otp: string) => void;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
}

export default function AdvancedOTPInput({
  length = 6,
  onComplete,
  onValueChange,
  error = false,
  errorMessage = "",
  disabled = false,
}: AdvancedOTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(length).fill(null));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isAutoReading, setIsAutoReading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fill OTP from a string (used by auto-read and paste)
  const fillOtpFromString = useCallback(
    (otpString: string) => {
      const digits = otpString.replace(/\D/g, "").split("").slice(0, length);
      if (digits.length === 0) return;

      const newOtp = Array(length).fill("");
      digits.forEach((digit, index) => {
        if (index < length) {
          newOtp[index] = digit;
        }
      });

      setOtp(newOtp);
      const joined = newOtp.join("");
      onValueChange?.(joined);

      if (digits.length >= length) {
        onComplete(joined);
      } else {
        inputRefs.current[digits.length]?.focus();
      }
    },
    [length, onComplete, onValueChange],
  );

  // Web OTP API: Auto-read OTP from SMS
  useEffect(() => {
    if (disabled) return;
    if (typeof window === "undefined") return;

    // Check if Web OTP API is available
    if (!("OTPCredential" in window)) return;

    const ac = new AbortController();
    abortControllerRef.current = ac;
    setIsAutoReading(true);

    (navigator.credentials as any)
      .get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      })
      .then((otpCredential: any) => {
        if (otpCredential?.code) {
          fillOtpFromString(otpCredential.code);
        }
      })
      .catch(() => {
        // Silently fail — user can still type manually
      })
      .finally(() => {
        setIsAutoReading(false);
      });

    return () => {
      ac.abort();
      abortControllerRef.current = null;
      setIsAutoReading(false);
    };
  }, [disabled, fillOtpFromString]);

  const handleChange = (index: number, value: string) => {
    if (disabled) return;

    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    // Only allow single character
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Call onChange callback
    const otpString = newOtp.join("");
    onValueChange?.(otpString);

    // Auto move to next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all fields are filled
    if (newOtp.every((val) => val !== "")) {
      onComplete(newOtp.join(""));
    }
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (disabled) return;

    if (event.key === "Backspace") {
      event.preventDefault();
      const newOtp = [...otp];

      if (otp[index]) {
        // If current field has value, clear it
        newOtp[index] = "";
      } else if (index > 0) {
        // If empty, move to previous and clear it
        newOtp[index - 1] = "";
        inputRefs.current[index - 1]?.focus();
      }

      setOtp(newOtp);
      const otpString = newOtp.join("");
      onValueChange?.(otpString);
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    event.preventDefault();
    const pastedData = event.clipboardData.getData("text");
    fillOtpFromString(pastedData);
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleBlur = () => {
    setFocusedIndex(null);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-3 justify-center md:gap-4">
        {otp.map((value, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <input
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={value}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={() => handleFocus(index)}
              onBlur={handleBlur}
              disabled={disabled}
              className={`
                w-12 h-14 md:w-14 md:h-16
                text-center text-2xl font-bold
                border-2 rounded-lg
                transition-all duration-200
                outline-none
                ${
                  error
                    ? "border-red-500 bg-red-50"
                    : focusedIndex === index
                      ? "border-green-500 bg-green-50 shadow-lg"
                      : value
                        ? "border-gray-300 bg-gray-50"
                        : "border-gray-300 bg-white"
                }
                ${disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "text-gray-800"}
              `}
            />
          </motion.div>
        ))}
      </div>

      {error && errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-red-500 text-sm font-medium flex items-center justify-center gap-2"
        >
          <span className="text-lg">⚠️</span>
          {errorMessage}
        </motion.div>
      )}

      <div className="text-center text-sm text-gray-500 flex items-center justify-center gap-2">
        {isAutoReading && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"
          >
            <Smartphone className="w-3.5 h-3.5 animate-pulse" />
            Auto-reading OTP...
          </motion.span>
        )}
        {!isAutoReading && (
          <span>
            {otp.filter((val) => val !== "").length}/{length} digits entered
          </span>
        )}
      </div>
    </div>
  );
}
