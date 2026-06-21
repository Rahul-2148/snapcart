// src/lib/services/geolocation.service.ts

/**
 * Browser Geolocation API wrapper with comprehensive error handling
 * for quick-commerce location detection.
 */

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type GeolocationErrorType =
  | "PERMISSION_DENIED"
  | "POSITION_UNAVAILABLE"
  | "TIMEOUT"
  | "NOT_SUPPORTED"
  | "UNKNOWN";

export interface GeolocationError {
  type: GeolocationErrorType;
  message: string;
}

const ERROR_MESSAGES: Record<GeolocationErrorType, string> = {
  PERMISSION_DENIED:
    "Location access was denied. Please enable location in your browser settings.",
  POSITION_UNAVAILABLE:
    "Unable to determine your location. Please try again or enter your address manually.",
  TIMEOUT:
    "Location detection timed out. Please check your GPS and try again.",
  NOT_SUPPORTED:
    "Your browser does not support location services. Please enter your address manually.",
  UNKNOWN: "An unexpected error occurred while getting your location.",
};

/**
 * Check if the browser supports geolocation.
 */
export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

/**
 * Check the current geolocation permission status via the Permissions API.
 * Returns "prompt" | "granted" | "denied" | "unavailable"
 */
export async function checkGeolocationPermission(): Promise<
  "prompt" | "granted" | "denied" | "unavailable"
> {
  if (!isGeolocationSupported()) return "unavailable";

  try {
    if (navigator.permissions) {
      const status = await navigator.permissions.query({
        name: "geolocation",
      });
      return status.state as "prompt" | "granted" | "denied";
    }
  } catch {
    // Permissions API not available — assume "prompt"
  }
  return "prompt";
}

/**
 * Get the current GPS position with proper error handling and timeout.
 */
export function getCurrentPosition(
  options?: {
    timeout?: number;
    enableHighAccuracy?: boolean;
    maximumAge?: number;
  },
): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject({
        type: "NOT_SUPPORTED",
        message: ERROR_MESSAGES.NOT_SUPPORTED,
      } as GeolocationError);
      return;
    }

    const { timeout = 15000, enableHighAccuracy = true, maximumAge = 0 } =
      options || {};

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let errorType: GeolocationErrorType;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorType = "PERMISSION_DENIED";
            break;
          case error.POSITION_UNAVAILABLE:
            errorType = "POSITION_UNAVAILABLE";
            break;
          case error.TIMEOUT:
            errorType = "TIMEOUT";
            break;
          default:
            errorType = "UNKNOWN";
        }

        reject({
          type: errorType,
          message: ERROR_MESSAGES[errorType],
        } as GeolocationError);
      },
      { enableHighAccuracy, timeout, maximumAge },
    );
  });
}
