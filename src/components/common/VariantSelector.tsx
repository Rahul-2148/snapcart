/**
 * Professional Variant Selector Component
 * Handles dynamic pricing display and variant selection
 */
"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  calculateDiscountPercent,
  formatVariantLabelWithPrice,
  isVariantInStock,
} from "@/lib/utils/priceUtils";

interface IVariant {
  _id: string;
  label: string;
  unit: { value: number; unit: string; multiplier?: number };
  price: { mrp: number; selling: number; discountPercent?: number };
  countInStock?: number;
  isDefault?: boolean;
}

interface VariantSelectorProps {
  variants: IVariant[];
  selectedVariantId: string | null;
  onVariantSelect: (variantId: string) => void;
  showPrices?: boolean;
  currency?: string;
}

const VariantSelector = ({
  variants,
  selectedVariantId,
  onVariantSelect,
  showPrices = true,
  currency = "₹",
}: VariantSelectorProps) => {
  if (!variants || variants.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Select Variant
        </h3>
        {variants.length > 1 && (
          <span className="text-xs text-gray-500">
            {variants.length} options available
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {variants.map((variant) => {
          const isSelected = variant._id === selectedVariantId;
          const inStock = isVariantInStock(variant);
          const discount = calculateDiscountPercent(
            variant.price.mrp,
            variant.price.selling
          );

          return (
            <motion.button
              key={variant._id}
              whileHover={{ scale: inStock ? 1.02 : 1 }}
              whileTap={{ scale: inStock ? 0.98 : 1 }}
              onClick={() => inStock && onVariantSelect(variant._id)}
              disabled={!inStock}
              className={`
                relative p-3 rounded-xl border-2 transition-all text-left
                ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                }
                ${!inStock ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              {/* Selected Check Mark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-emerald-600 rounded-full p-1"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}

              {/* Discount Badge */}
              {discount > 0 && inStock && (
                <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {discount}%
                </div>
              )}

              <div className="space-y-1">
                {/* Variant Label */}
                <div className="font-semibold text-gray-800 text-sm">
                  {variant.unit.value}
                  {variant.unit.unit}
                </div>

                {/* Price Display */}
                {showPrices && (
                  <div className="space-y-0.5">
                    <div className="font-bold text-emerald-700">
                      {currency}
                      {variant.price.selling.toFixed(0)}
                    </div>
                    {variant.price.mrp > variant.price.selling && (
                      <div className="text-xs text-gray-400 line-through">
                        {currency}
                        {variant.price.mrp.toFixed(0)}
                      </div>
                    )}
                  </div>
                )}

                {/* Stock Status */}
                {!inStock && (
                  <div className="text-xs text-red-500 font-medium">
                    Out of stock
                  </div>
                )}
                {inStock &&
                  variant.countInStock !== undefined &&
                  variant.countInStock <= 5 && (
                    <div className="text-xs text-orange-500 font-medium">
                      Only {variant.countInStock} left
                    </div>
                  )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default VariantSelector;
