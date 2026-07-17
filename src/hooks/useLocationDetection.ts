// src/hooks/useLocationDetection.ts
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { useSession } from "next-auth/react";
import axios from "axios";
import {
  hydrateFromStorage,
  setLocation,
  setPermissionStatus,
  setDetecting,
  setError,
  setLocationPickerOpen,
  setPermissionPromptShown,
  setShowGpsOverlay,
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
 * 3. If permission granted → fetch GPS (only if no saved/manual location exists)
 * 4. If permission prompt → show permission prompt UI
 * 5. If permission denied → show location picker modal
 */
export function useLocationDetection() {
  const dispatch = useAppDispatch();
  const location = useAppSelector((state) => state.location);
  const { status } = useSession();
  const hasRun = useRef(false);

  // ── Detect location via GPS ──────────────────────────────────────
  const detectViaGPS = useCallback(async (showOverlay = false) => {
    dispatch(setDetecting(true));
    if (showOverlay) dispatch(setShowGpsOverlay(true));

    try {
      const pos = await getCurrentPosition({ 
        timeout: 15000,
        enableHighAccuracy: true,
        maximumAge: 0
      });

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
          shortAddress: geocodeResult.shortAddress,
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

      // Mark session as auto-detected so it remains stable
      if (typeof window !== "undefined") {
        sessionStorage.setItem("snapcart_gps_detected_this_session", "true");
      }

      // Auto-dismiss the overlay after a short celebration delay
      if (showOverlay) {
        setTimeout(() => dispatch(setShowGpsOverlay(false)), 2500);
      }
    } catch (err) {
      const geoErr = err as GeolocationError;
      if (showOverlay) dispatch(setShowGpsOverlay(false));
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

      let hasSavedOrManualLocation = false;
      let locationSetFromDb = false;
      const savedLoc = localStorage.getItem("snapcart_location");
      if (savedLoc) {
        try {
          const parsed = JSON.parse(savedLoc);
          if (parsed.latitude && parsed.longitude && (parsed.source === "saved" || parsed.source === "manual")) {
            hasSavedOrManualLocation = true;
          }
        } catch {}
      }

      // Step 2: Fetch default address from DB if authenticated
      if (status === "authenticated") {
        try {
          const res = await axios.get("/api/location/current");
          if (res.data?.success && res.data?.address) {
            const addr = res.data.address;
            if (addr.latitude && addr.longitude) {
              dispatch(
                setLocation({
                  latitude: addr.latitude,
                  longitude: addr.longitude,
                  fullAddress: addr.fullAddress || addr.street,
                  shortAddress: addr.name || addr.street,
                  area: "",
                  city: addr.city,
                  state: addr.state,
                  country: addr.country || "India",
                  pincode: addr.zipCode,
                  source: "saved",
                }),
              );
              dispatch(
                fetchNearbyStores({
                  lat: addr.latitude,
                  lng: addr.longitude,
                }),
              );
              hasSavedOrManualLocation = true;
              locationSetFromDb = true;
            }
          }
        } catch (err) {
          console.error("Failed to sync backend default address:", err);
        }
      }

      // Step 3: Check browser support
      if (!isGeolocationSupported()) {
        dispatch(setPermissionStatus("unavailable"));
        if (!hasSavedOrManualLocation && !savedLoc) {
          dispatch(setLocationPickerOpen(true));
        }
        return;
      }

      // Step 4: Check permission status
      const permission = await checkGeolocationPermission();
      dispatch(setPermissionStatus(permission));

      // Step 5: If saved location exists in localStorage and was not overridden by DB default, refresh stores
      if (savedLoc && !locationSetFromDb) {
        try {
          const parsed = JSON.parse(savedLoc);
          if (parsed.latitude && parsed.longitude) {
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

      // Step 6: Act based on permission
      if (permission === "granted") {
        const detectedThisSession = typeof window !== "undefined" && sessionStorage.getItem("snapcart_gps_detected_this_session") === "true";
        if (!detectedThisSession) {
          // If no location is set yet, show the full overlay loader.
          // If a location is already loaded from localStorage or DB, silently refresh in the background.
          const showOverlay = !hasSavedOrManualLocation && !savedLoc;
          detectViaGPS(showOverlay);
        }
      } else if (permission === "prompt") {
        // Show permission prompt if no location is available
        if (!hasSavedOrManualLocation && !savedLoc) {
          dispatch(setPermissionPromptShown(true));
        }
      } else if (permission === "denied") {
        // If no location, open location picker
        if (!hasSavedOrManualLocation && !savedLoc) {
          dispatch(setLocationPickerOpen(true));
        }
      }
    };

    initialize();
  }, [dispatch, detectViaGPS, status]);

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
