/**
 * Custom Hook for Managing Variant Pricing
 * Simplifies price calculations and variant management in components
 */

import { useMemo } from "react";
import {
  getPriceRange,
  hasVariablePricing,
  getBestDealVariant,
  getDiscountBadgeText,
  formatPriceDisplay,
  formatMrpDisplay,
  calculateDiscountPercent,
  getAvailableVariants,
  isVariantInStock,
} from "@/lib/utils/priceUtils";

interface IVariant {
  _id?: string;
  label: string;
  unit: { value: number; unit: string; multiplier?: number };
  price: { mrp: number; selling: number; discountPercent?: number };
  countInStock?: number;
  isDefault?: boolean;
}

interface UseVariantPricingOptions {
  currency?: string;
}

/**
 * Hook to manage variant pricing and selection
 * Returns all necessary pricing information and utilities
 */
export const useVariantPricing = (
  variants: IVariant[],
  options: UseVariantPricingOptions = {}
) => {
  const { currency = "₹" } = options;

  // Memoize expensive calculations
  const priceRange = useMemo(() => getPriceRange(variants), [variants]);

  const isVariable = useMemo(
    () => hasVariablePricing(variants),
    [variants]
  );

  const bestDeal = useMemo(() => getBestDealVariant(variants), [variants]);

  const availableVariants = useMemo(
    () => getAvailableVariants(variants),
    [variants]
  );

  const defaultVariant = useMemo(
    () => variants.find((v) => v.isDefault) || variants[0] || null,
    [variants]
  );

  const discountBadge = useMemo(
    () => getDiscountBadgeText(priceRange),
    [priceRange]
  );

  const priceDisplayText = useMemo(
    () => formatPriceDisplay(priceRange, currency),
    [priceRange, currency]
  );

  const mrpDisplayText = useMemo(
    () => formatMrpDisplay(priceRange, currency),
    [priceRange, currency]
  );

  // Get pricing info for a specific variant
  const getVariantPricing = (variantId: string | null) => {
    const variant = variants.find((v) => v._id === variantId);
    if (!variant) return null;

    return {
      variant,
      selling: variant.price.selling,
      mrp: variant.price.mrp,
      discount: calculateDiscountPercent(
        variant.price.mrp,
        variant.price.selling
      ),
      inStock: isVariantInStock(variant),
      stock: variant.countInStock ?? 0,
      isDefault: variant.isDefault ?? false,
    };
  };

  return {
    // Price range information
    priceRange,
    isVariable,
    
    // Formatted displays
    priceDisplayText,
    mrpDisplayText,
    discountBadge,
    
    // Variant information
    defaultVariant,
    bestDeal,
    availableVariants,
    allVariants: variants,
    variantCount: variants.length,
    
    // Utilities
    getVariantPricing,
    
    // Stats
    stats: {
      minPrice: priceRange.minSelling,
      maxPrice: priceRange.maxSelling,
      maxDiscount: priceRange.maxDiscount,
      hasMultipleOptions: variants.length > 1,
      allInStock: availableVariants.length === variants.length,
      someInStock: availableVariants.length > 0,
    },
  };
};

/**
 * Hook to manage selected variant state with pricing
 */
export const useSelectedVariant = (
  variants: IVariant[],
  initialVariantId?: string | null
) => {
  const pricing = useVariantPricing(variants);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialVariantId ?? pricing.defaultVariant?._id ?? null
  );

  const selectedVariant = useMemo(
    () => variants.find((v) => v._id === selectedId) || pricing.defaultVariant,
    [selectedId, variants, pricing.defaultVariant]
  );

  const selectedPricing = useMemo(
    () => (selectedId ? pricing.getVariantPricing(selectedId) : null),
    [selectedId, pricing]
  );

  return {
    ...pricing,
    selectedId,
    selectedVariant,
    selectedPricing,
    setSelectedId,
    selectVariant: (variantId: string) => setSelectedId(variantId),
    selectDefault: () => setSelectedId(pricing.defaultVariant?._id ?? null),
    selectBestDeal: () => setSelectedId(pricing.bestDeal?._id ?? null),
  };
};

// Export React for use in the hook
import React from "react";
