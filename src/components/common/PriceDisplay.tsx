/**
 * Professional Price Display Component
 * Shows prices with savings, discounts, and comparison
 */
"use client";

import { motion } from "framer-motion";
import { TrendingDown, Tag, Sparkles } from "lucide-react";
import {
  calculateDiscountPercent,
  getSavingsAmount,
  formatSavingsDisplay,
} from "@/lib/utils/priceUtils";

interface PriceDisplayProps {
  mrp: number;
  selling: number;
  currency?: string;
  size?: "sm" | "md" | "lg";
  showSavings?: boolean;
  showDiscount?: boolean;
  className?: string;
}

const PriceDisplay = ({
  mrp,
  selling,
  currency = "₹",
  size = "md",
  showSavings = true,
  showDiscount = true,
  className = "",
}: PriceDisplayProps) => {
  const discount = calculateDiscountPercent(mrp, selling);
  const savings = getSavingsAmount(mrp, selling);
  const hasSavings = savings > 0;

  const sizeClasses = {
    sm: {
      selling: "text-xl",
      mrp: "text-sm",
      badge: "text-xs px-2 py-0.5",
      savings: "text-xs",
    },
    md: {
      selling: "text-3xl",
      mrp: "text-base",
      badge: "text-sm px-3 py-1",
      savings: "text-sm",
    },
    lg: {
      selling: "text-4xl lg:text-5xl",
      mrp: "text-lg",
      badge: "text-base px-4 py-1.5",
      savings: "text-base",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Price Display */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Selling Price */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`${classes.selling} font-bold text-gray-900`}
        >
          {currency}
          {selling.toFixed(0)}
        </motion.div>

        {/* MRP (Crossed Out) */}
        {hasSavings && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={`${classes.mrp} text-gray-400 line-through`}
          >
            {currency}
            {mrp.toFixed(0)}
          </motion.div>
        )}

        {/* Discount Badge */}
        {showDiscount && discount > 0 && (
          <motion.span
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className={`
              ${classes.badge}
              bg-gradient-to-r from-red-500 to-orange-500 
              text-white font-semibold rounded-full 
              inline-flex items-center gap-1
              shadow-md
            `}
          >
            <Tag className="w-3 h-3" />
            {discount}% OFF
          </motion.span>
        )}
      </div>

      {/* Savings Information */}
      {showSavings && hasSavings && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-1.5 text-emerald-700">
            <TrendingDown className="w-4 h-4" />
            <span className={`${classes.savings} font-semibold`}>
              {formatSavingsDisplay(mrp, selling, currency)}
            </span>
          </div>
          <Sparkles className="w-4 h-4 text-amber-500" />
        </motion.div>
      )}
    </div>
  );
};

export default PriceDisplay;
