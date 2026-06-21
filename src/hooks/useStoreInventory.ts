// src/hooks/useStoreInventory.ts
"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { fetchStoreInventory, fetchDeliveryEta } from "@/redux/features/storeSlice";
import { setGroceries } from "@/redux/features/grocerySlice";

/**
 * Hook that watches for store changes and refreshes inventory.
 * When selectedStore changes, it fetches products from the new store.
 * Falls back to global products if no store is selected.
 */
export function useStoreInventory() {
  const dispatch = useAppDispatch();
  const selectedStore = useAppSelector((state) => state.location.selectedStore);
  const latitude = useAppSelector((state) => state.location.latitude);
  const longitude = useAppSelector((state) => state.location.longitude);
  const {
    storeGroceries,
    storeCategories,
    isLoadingInventory,
    inventoryError,
    deliveryEta,
    usingGlobalFallback,
    currentStoreId,
  } = useAppSelector((state) => state.store);

  const prevStoreIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedStore?._id) return;

    // Only fetch if store actually changed
    if (prevStoreIdRef.current === selectedStore._id) return;
    prevStoreIdRef.current = selectedStore._id;

    // Fetch store inventory
    dispatch(fetchStoreInventory({ storeId: selectedStore._id }));

    // Fetch delivery ETA
    if (latitude && longitude) {
      dispatch(
        fetchDeliveryEta({
          storeId: selectedStore._id,
          lat: latitude,
          lng: longitude,
        }),
      );
    }
  }, [selectedStore?._id, latitude, longitude, dispatch]);

  // Sync store groceries to grocery slice for components that read from there
  useEffect(() => {
    if (storeGroceries.length > 0 && !usingGlobalFallback) {
      dispatch(setGroceries(storeGroceries as any));
    }
  }, [storeGroceries, usingGlobalFallback, dispatch]);

  return {
    groceries: storeGroceries,
    categories: storeCategories,
    isLoading: isLoadingInventory,
    error: inventoryError,
    deliveryEta,
    usingGlobalFallback,
    currentStoreId,
    hasStore: !!selectedStore,
  };
}
