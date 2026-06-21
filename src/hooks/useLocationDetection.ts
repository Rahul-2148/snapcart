// src/hooks/useLocationDetection.ts
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import {
  hydrateFromStorage,
  setLocation,
  setPermissionStatus,
  setDetecting,
  setError,
  setLocationPickerOpen,
  setPermissionPromptShown,
  reverseGeocodeCoords,
  fetchNearbyStores,
} from "@/redux/features/locationSlice";
import {
  isGeolocationSupported,
  checkGeolocationPermission,
  getCurrentPosition,
  type GeolocationError,
} from "@/lib/services/geolocation.service";

/**
 * Master hook that orchestrates the full location detection flow on app startup.
 *
 * Flow:
 * 1. On mount → hydrate from localStorage → display immediately
 * 2. Check geolocation permission
 * 3. If permission granted → fetch GPS → reverse geocode → fetch nearby stores
 * 4. If permission prompt → show permission prompt UI
 * 5. If permission denied → show location picker modal
 */
export function useLocationDetection() {
  const dispatch = useAppDispatch();
  const location = useAppSelector((state) => state.location);
  const hasRun = useRef(false);

  // ── Detect location via GPS ──────────────────────────────────────
  const detectViaGPS = useCallback(async () => {
    dispatch(setDetecting(true));

    try {
      const pos = await getCurrentPosition({ timeout: 15000 });

      // Reverse geocode the coordinates
      const geocodeResult = await dispatch(
        reverseGeocodeCoords({ lat: pos.latitude, lng: pos.longitude }),
      ).unwrap();

      // Set the full location
      dispatch(
        setLocation({
          latitude: pos.latitude,
          longitude: pos.longitude,
          fullAddress: geocodeResult.fullAddress,
          area: geocodeResult.area,
          city: geocodeResult.city,
          state: geocodeResult.state,
          country: geocodeResult.country,
          pincode: geocodeResult.pincode,
          source: "gps",
        }),
      );

      // Fetch nearby stores
      dispatch(
        fetchNearbyStores({ lat: pos.latitude, lng: pos.longitude }),
      );

      dispatch(setPermissionStatus("granted"));
    } catch (err) {
      const geoErr = err as GeolocationError;
      if (geoErr.type === "PERMISSION_DENIED") {
        dispatch(setPermissionStatus("denied"));
        // Only open picker if we don't have a saved location
        if (!location.latitude) {
          dispatch(setLocationPickerOpen(true));
        }
      } else {
        dispatch(setError(geoErr.message || "Failed to detect location"));
      }
    } finally {
      dispatch(setDetecting(false));
    }
  }, [dispatch, location.latitude]);

  // ── Retry location detection ─────────────────────────────────────
  const retry = useCallback(() => {
    detectViaGPS();
  }, [detectViaGPS]);

  // ── Open location picker modal ───────────────────────────────────
  const openLocationPicker = useCallback(() => {
    dispatch(setLocationPickerOpen(true));
  }, [dispatch]);

  // ── Main initialization effect ───────────────────────────────────
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const initialize = async () => {
      // Step 1: Hydrate from localStorage (instant — no blank state)
      dispatch(hydrateFromStorage());

      // Step 2: Check browser support
      if (!isGeolocationSupported()) {
        dispatch(setPermissionStatus("unavailable"));
        // If no saved location, open picker
        const savedLoc = localStorage.getItem("snapcart_location");
        if (!savedLoc) {
          dispatch(setLocationPickerOpen(true));
        }
        return;
      }

      // Step 3: Check permission status
      const permission = await checkGeolocationPermission();
      dispatch(setPermissionStatus(permission));

      // Step 4: If saved location exists, fetch stores for it in background
      const savedLoc = localStorage.getItem("snapcart_location");
      if (savedLoc) {
        try {
          const parsed = JSON.parse(savedLoc);
          if (parsed.latitude && parsed.longitude) {
            // Background: refresh stores
            dispatch(
              fetchNearbyStores({
                lat: parsed.latitude,
                lng: parsed.longitude,
              }),
            );
          }
        } catch {
          // malformed data
        }
      }

      // Step 5: Act based on permission
      if (permission === "granted") {
        // Silently refresh GPS location in background
        detectViaGPS();
      } else if (permission === "prompt") {
        // Show permission prompt if no saved location
        if (!savedLoc) {
          dispatch(setPermissionPromptShown(true));
        }
      } else if (permission === "denied") {
        // If no saved location, open location picker
        if (!savedLoc) {
          dispatch(setLocationPickerOpen(true));
        }
      }
    };

    initialize();
  }, [dispatch, detectViaGPS]);

  return {
    isDetecting: location.isDetecting,
    isReverseGeocoding: location.isReverseGeocoding,
    permissionStatus: location.permissionStatus,
    error: location.error,
    hasLocation: location.latitude !== null && location.longitude !== null,
    retry,
    openLocationPicker,
    detectViaGPS,
  };
}
