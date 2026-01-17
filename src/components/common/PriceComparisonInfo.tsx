/**
 * Price Comparison Info Component
 * Shows helpful price information for products with multiple variants
 */
"use client";

import { motion } from "framer-motion";
import { Info, TrendingDown, Package } from "lucide-react";
import {
  getPriceRange,
  getBestDealVariant,
  hasVariablePricing,
} from "@/lib/utils/priceUtils";

interface IVariant {
  _id: string;
  label: string;
  unit: { value: number; unit: string; multiplier?: number };
  price: { mrp: number; selling: number; discountPercent?: number };
  countInStock?: number;
  isDefault?: boolean;
}

interface PriceComparisonInfoProps {
  variants: IVariant[];
  currency?: string;
}

const PriceComparisonInfo = ({
  variants,
  currency = "₹",
}: PriceComparisonInfoProps) => {
  if (!hasVariablePricing(variants)) {
    return null;
  }

  const priceRange = getPriceRange(variants);
  const bestDeal = getBestDealVariant(variants);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100"
    >
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <h4 className="font-semibold text-gray-900 text-sm">
            💡 Smart Shopping Tip
          </h4>
          <div className="space-y-1.5 text-sm text-gray-700">
            <p className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              <span>
                Prices range from{" "}
                <strong className="text-emerald-700">
                  {currency}
                  {priceRange.minSelling.toFixed(0)}
                </strong>{" "}
                to{" "}
                <strong className="text-emerald-700">
                  {currency}
                  {priceRange.maxSelling.toFixed(0)}
                </strong>
              </span>
            </p>
            {bestDeal && priceRange.maxDiscount > 0 && (
              <p className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" />
                <span>
                  Best deal:{" "}
                  <strong className="text-amber-700">{bestDeal.label}</strong>{" "}
                  with{" "}
                  <strong className="text-amber-700">
                    {priceRange.maxDiscount}% off
                  </strong>
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PriceComparisonInfo;
