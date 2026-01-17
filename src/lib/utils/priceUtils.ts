/**
 * Professional Price Utilities for Dynamic Variant Pricing
 * Handles multiple pricing scenarios across product variants
 */

interface IPriceData {
  mrp: number;
  selling: number;
  discountPercent?: number;
}

interface IVariant {
  _id?: string;
  label: string;
  unit: { value: number; unit: string; multiplier?: number };
  price: IPriceData;
  countInStock?: number;
  isDefault?: boolean;
}

interface IPriceRange {
  minMrp: number;
  maxMrp: number;
  minSelling: number;
  maxSelling: number;
  hasSamePrice: boolean;
  maxDiscount: number;
}

/**
 * Calculate discount percentage with precision
 */
export const calculateDiscountPercent = (
  mrpPrice: number,
  sellingPrice: number
): number => {
  if (
    isNaN(mrpPrice) ||
    isNaN(sellingPrice) ||
    mrpPrice <= 0 ||
    sellingPrice <= 0 ||
    sellingPrice >= mrpPrice
  ) {
    return 0;
  }

  return Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100);
};

/**
 * Get price range across all variants
 * Handles cases where all variants have same price or different prices
 */
export const getPriceRange = (variants: IVariant[]): IPriceRange => {
  if (!variants || variants.length === 0) {
    return {
      minMrp: 0,
      maxMrp: 0,
      minSelling: 0,
      maxSelling: 0,
      hasSamePrice: true,
      maxDiscount: 0,
    };
  }

  const prices = variants.map((v) => ({
    mrp: v.price.mrp,
    selling: v.price.selling,
    discount: calculateDiscountPercent(v.price.mrp, v.price.selling),
  }));

  const minMrp = Math.min(...prices.map((p) => p.mrp));
  const maxMrp = Math.max(...prices.map((p) => p.mrp));
  const minSelling = Math.min(...prices.map((p) => p.selling));
  const maxSelling = Math.max(...prices.map((p) => p.selling));
  const maxDiscount = Math.max(...prices.map((p) => p.discount));

  // Check if all variants have the same selling price
  const hasSamePrice = new Set(prices.map((p) => p.selling)).size === 1;

  return {
    minMrp,
    maxMrp,
    minSelling,
    maxSelling,
    hasSamePrice,
    maxDiscount,
  };
};

/**
 * Format price display based on price range
 * Returns appropriate format: "₹100" or "₹100 - ₹500"
 */
export const formatPriceDisplay = (
  priceRange: IPriceRange,
  currency: string = "₹"
): string => {
  if (priceRange.hasSamePrice) {
    return `${currency}${priceRange.minSelling.toFixed(0)}`;
  }

  return `${currency}${priceRange.minSelling.toFixed(0)} - ${currency}${priceRange.maxSelling.toFixed(0)}`;
};

/**
 * Format MRP display (crossed-out price)
 */
export const formatMrpDisplay = (
  priceRange: IPriceRange,
  currency: string = "₹"
): string | null => {
  if (priceRange.hasSamePrice) {
    // Only show MRP if there's a discount
    if (priceRange.minMrp > priceRange.minSelling) {
      return `${currency}${priceRange.minMrp.toFixed(0)}`;
    }
    return null;
  }

  return `${currency}${priceRange.minMrp.toFixed(0)} - ${currency}${priceRange.maxMrp.toFixed(0)}`;
};

/**
 * Get best deal variant (highest discount or lowest price)
 */
export const getBestDealVariant = (variants: IVariant[]): IVariant | null => {
  if (!variants || variants.length === 0) return null;

  return variants.reduce((best, current) => {
    const bestDiscount = calculateDiscountPercent(
      best.price.mrp,
      best.price.selling
    );
    const currentDiscount = calculateDiscountPercent(
      current.price.mrp,
      current.price.selling
    );

    if (currentDiscount > bestDiscount) {
      return current;
    } else if (currentDiscount === bestDiscount) {
      // If same discount, prefer lower selling price
      return current.price.selling < best.price.selling ? current : best;
    }
    return best;
  });
};

/**
 * Check if product has variable pricing
 */
export const hasVariablePricing = (variants: IVariant[]): boolean => {
  if (!variants || variants.length <= 1) return false;
  const priceRange = getPriceRange(variants);
  return !priceRange.hasSamePrice;
};

/**
 * Get discount badge text
 * Returns "Up to X% OFF" for variable pricing or "X% OFF" for same pricing
 */
export const getDiscountBadgeText = (
  priceRange: IPriceRange
): string | null => {
  if (priceRange.maxDiscount === 0) return null;

  if (priceRange.hasSamePrice) {
    return `${priceRange.maxDiscount}% OFF`;
  }

  return `Up to ${priceRange.maxDiscount}% OFF`;
};

/**
 * Format variant label with price
 * E.g., "500g - ₹150" or "1kg - ₹280"
 */
export const formatVariantLabelWithPrice = (
  variant: IVariant,
  currency: string = "₹"
): string => {
  const unitValue = variant.unit.value;
  const unit = variant.unit.unit;
  return `${unitValue}${unit} - ${currency}${variant.price.selling.toFixed(0)}`;
};

/**
 * Get savings amount
 */
export const getSavingsAmount = (mrp: number, selling: number): number => {
  return Math.max(0, mrp - selling);
};

/**
 * Format savings display
 */
export const formatSavingsDisplay = (
  mrp: number,
  selling: number,
  currency: string = "₹"
): string | null => {
  const savings = getSavingsAmount(mrp, selling);
  if (savings === 0) return null;
  return `You save ${currency}${savings.toFixed(0)}`;
};

/**
 * Check if variant is in stock
 */
export const isVariantInStock = (variant: IVariant): boolean => {
  return (variant.countInStock ?? 0) > 0;
};

/**
 * Get available variants only (in stock)
 */
export const getAvailableVariants = (variants: IVariant[]): IVariant[] => {
  return variants.filter((v) => isVariantInStock(v));
};

/**
 * Sort variants by price (low to high)
 */
export const sortVariantsByPrice = (
  variants: IVariant[],
  ascending: boolean = true
): IVariant[] => {
  return [...variants].sort((a, b) => {
    const priceA = a.price.selling;
    const priceB = b.price.selling;
    return ascending ? priceA - priceB : priceB - priceA;
  });
};

/**
 * Sort variants by size (unit value)
 */
export const sortVariantsBySize = (
  variants: IVariant[],
  ascending: boolean = true
): IVariant[] => {
  return [...variants].sort((a, b) => {
    const sizeA = a.unit.value * (a.unit.multiplier || 1);
    const sizeB = b.unit.value * (b.unit.multiplier || 1);
    return ascending ? sizeA - sizeB : sizeB - sizeA;
  });
};
