// src/lib/client/price.ts

/**
 * UI-only discount calculation (for preview)
 * Backend is the final source of truth
 */
export const calculateDiscountPercentUI = (
  mrpPrice: number | string,
  sellingPrice: number | string
): number => {
  const mrp = Number(mrpPrice);
  const selling = Number(sellingPrice);

  if (
    isNaN(mrp) ||
    isNaN(selling) ||
    mrp <= 0 ||
    selling <= 0 ||
    selling >= mrp
  ) {
    return 0;
  }

  return Math.round(((mrp - selling) / mrp) * 100);
};
