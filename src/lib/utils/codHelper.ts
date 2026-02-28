/**
 * Helper functions for COD (Cash on Delivery) handling
 *
 * COD Rules:
 * - Per-product COD status: not-allowed, with-charge, free
 * - Global flat charge applies to "with-charge" products
 * - Minimum order value: configurable (default ₹100)
 * - Maximum order value: configurable (default ₹1000)
 * - If any product has "not-allowed", entire COD is blocked
 */

export interface CodCheckResult {
  isCodAvailable: boolean;
  totalCodCharge: number; // Sum of charges for "with-charge" products
  blockedProducts: string[]; // Products with "not-allowed"
  freeProducts: string[]; // Products with "free" COD
  chargedProducts: string[]; // Products with "with-charge" COD
  recommendation: string;
  orderValue?: number;
  minOrderValue?: number;
  maxOrderValue?: number;
}

/**
 * Checks if COD is available for cart items
 * Takes into account:
 * - Individual product COD status (not-allowed, with-charge, free)
 * - Order value (minimum and maximum thresholds)
 * - Global COD settings (flat charge for "with-charge" products)
 *
 * @param cartItems - Array of cart items with variant details
 * @param cartSubTotal - Current cart subtotal (products + delivery)
 * @param codSettings - Global COD settings (optional - uses defaults if not provided)
 * @returns CodCheckResult with availability and per-product charges
 */
export function checkCodAvailability(
  cartItems: any[] = [],
  cartSubTotal: number = 0,
  codSettings?: {
    isEnabled: boolean;
    flatCharge: number;
    minOrderValue: number;
    maxOrderValue: number;
  },
): CodCheckResult {
  // Default settings if not provided
  const settings = codSettings || {
    isEnabled: true,
    flatCharge: 10,
    minOrderValue: 100,
    maxOrderValue: 1000,
  };

  const blockedProducts: string[] = [];
  const freeProducts: string[] = [];
  const chargedProducts: string[] = [];
  let totalCodCharge = 0;

  // Handle empty or invalid cart
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return {
      isCodAvailable: true,
      totalCodCharge: 0,
      blockedProducts: [],
      freeProducts: [],
      chargedProducts: [],
      recommendation: "",
      orderValue: cartSubTotal,
      minOrderValue: settings.minOrderValue,
      maxOrderValue: settings.maxOrderValue,
    };
  }

  // Check if COD is globally enabled
  if (!settings.isEnabled) {
    return {
      isCodAvailable: false,
      totalCodCharge: 0,
      blockedProducts: [],
      freeProducts: [],
      chargedProducts: [],
      recommendation:
        "COD is not available at the moment. Please use online payment.",
      orderValue: cartSubTotal,
      minOrderValue: settings.minOrderValue,
      maxOrderValue: settings.maxOrderValue,
    };
  }

  // Check order value constraints FIRST
  if (cartSubTotal < settings.minOrderValue) {
    return {
      isCodAvailable: false,
      totalCodCharge: 0,
      blockedProducts: [],
      freeProducts: [],
      chargedProducts: [],
      recommendation: `COD is only available for orders above ₹${settings.minOrderValue}. Current order value: ₹${cartSubTotal.toFixed(2)}`,
      orderValue: cartSubTotal,
      minOrderValue: settings.minOrderValue,
      maxOrderValue: settings.maxOrderValue,
    };
  }

  if (cartSubTotal > settings.maxOrderValue) {
    return {
      isCodAvailable: false,
      totalCodCharge: 0,
      blockedProducts: [],
      freeProducts: [],
      chargedProducts: [],
      recommendation: `COD is not available for orders above ₹${settings.maxOrderValue}. Current order value: ₹${cartSubTotal.toFixed(2)}. Please use online payment for large orders.`,
      orderValue: cartSubTotal,
      minOrderValue: settings.minOrderValue,
      maxOrderValue: settings.maxOrderValue,
    };
  }

  // Check product-level COD settings
  cartItems.forEach((item) => {
    // Defensive checks for null/undefined data
    if (!item) return;

    const variant = item.variant;
    if (!variant) return;

    const grocery = item.grocery || variant.grocery;
    const productName = grocery?.name || "Unknown Product";

    // Check COD status - default to "with-charge" if not set
    const codStatus = variant.cod?.status || "with-charge";

    if (codStatus === "not-allowed") {
      blockedProducts.push(productName);
    } else if (codStatus === "free") {
      freeProducts.push(productName);
    } else if (codStatus === "with-charge") {
      // Add charge once per unique product (not per quantity)
      if (!chargedProducts.includes(productName)) {
        chargedProducts.push(productName);
        totalCodCharge += settings.flatCharge;
      }
    }
  });

  const isCodAvailable = blockedProducts.length === 0;

  let recommendation = "";
  if (!isCodAvailable) {
    recommendation = `Some products in your cart don't allow COD. Please use online payment.`;
  } else if (totalCodCharge > 0) {
    recommendation = `COD charges of ₹${totalCodCharge.toFixed(2)} will be added for ${chargedProducts.length} product(s). Consider online payment to save money.`;
  } else {
    recommendation =
      "COD is available with no additional charges for your cart items.";
  }

  return {
    isCodAvailable,
    totalCodCharge,
    blockedProducts,
    freeProducts,
    chargedProducts,
    recommendation,
    orderValue: cartSubTotal,
    minOrderValue: settings.minOrderValue,
    maxOrderValue: settings.maxOrderValue,
  };
}

/**
 * Get flat COD charge for order (single charge regardless of number of items)
 * Note: Actual charge comes from database settings, this returns based on settings passed
 */
export function getCodChargeForOrder(codSettings?: {
  isEnabled: boolean;
  flatCharge: number;
}): number {
  if (!codSettings?.isEnabled) return 0;
  return codSettings.flatCharge || 10; // Default ₹10 if not set
}
