// src/lib/utils/price.ts

/**
 * Calculate discount percentage from MRP and selling price
 * Example: (100, 80) => 20
 */
export const calculateDiscountPercent = (
  mrp: number,
  selling: number
): number => {
  if (!mrp || !selling || mrp <= selling || mrp <= 0) {
    return 0;
  }

  return Math.round(((mrp - selling) / mrp) * 100);
};
