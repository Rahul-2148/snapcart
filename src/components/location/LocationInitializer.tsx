// src/components/location/LocationInitializer.tsx
"use client";

import { useLocationDetection } from "@/hooks/useLocationDetection";
import LocationPickerModal from "./LocationPickerModal";
import LocationPermissionPrompt from "./LocationPermissionPrompt";
import CartStoreChangeWarning from "./CartStoreChangeWarning";

/**
 * Silent component that initializes the location system on app mount.
 * Renders global location-related modals and banners.
 *
 * This should be placed once in the app layout (ClientLayout).
 */
const LocationInitializer = () => {
  // Run the location detection flow
  useLocationDetection();

  return (
    <>
      {/* Location picker modal — opens when user clicks location header */}
      <LocationPickerModal />

      {/* Permission prompt — shown on first visit */}
      <LocationPermissionPrompt />

      {/* Cart store change warning — shown when store changes affect cart */}
      <CartStoreChangeWarning />
    </>
  );
};

export default LocationInitializer;
