// src/hooks/useCartStoreValidation.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/redux/store";

export interface CartWarningItem {
  variantId: string;
  groceryName: string;
  reason: "unavailable" | "price_changed";
  oldPrice?: number;
  newPrice?: number;
}

/**
 * Hook that validates cart items when the selected store changes.
 * Checks availability and price changes in the new store's inventory.
 */
export function useCartStoreValidation() {
  const cartItems = useAppSelector((state) => state.cart.cartItems);
  const selectedStore = useAppSelector(
    (state) => state.location.selectedStore,
  );
  const [warningItems, setWarningItems] = useState<CartWarningItem[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [previousStoreId, setPreviousStoreId] = useState<string | null>(null);

  const validateCart = useCallback(
    async (newStoreId: string) => {
      if (cartItems.length === 0) return;

      setIsValidating(true);
      try {
        // Fetch new store's inventory to check availability
        const res = await fetch(`/api/products/by-store/${newStoreId}`);
        if (!res.ok) return;

        const data = await res.json();
        const storeProducts = data.groceries || [];

        // Build a set of available variant IDs in the new store
        const availableVariantIds = new Set<string>();
        storeProducts.forEach((g: any) => {
          if (g.variants) {
            g.variants.forEach((v: any) => {
              availableVariantIds.add(v._id);
            });
          }
        });

        // Check each cart item
        const warnings: CartWarningItem[] = [];
        cartItems.forEach((item) => {
          if (!availableVariantIds.has(item.variant._id)) {
            warnings.push({
              variantId: item.variant._id,
              groceryName:
                item.variant.grocery?.name || item.variant.label || "Unknown",
              reason: "unavailable",
            });
          }
        });

        if (warnings.length > 0) {
          setWarningItems(warnings);
          setShowWarning(true);
        }
      } catch (err) {
        console.error("Cart validation error:", err);
      } finally {
        setIsValidating(false);
      }
    },
    [cartItems],
  );

  // Watch for store changes
  useEffect(() => {
    if (!selectedStore?._id) return;
    if (previousStoreId && previousStoreId !== selectedStore._id) {
      // Store changed — validate cart
      validateCart(selectedStore._id);
    }
    setPreviousStoreId(selectedStore._id);
  }, [selectedStore?._id, previousStoreId, validateCart]);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    setWarningItems([]);
  }, []);

  return {
    warningItems,
    showWarning,
    isValidating,
    dismissWarning,
    hasWarnings: warningItems.length > 0,
  };
}
