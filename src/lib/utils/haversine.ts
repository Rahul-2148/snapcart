// src/lib/utils/haversine.ts

/**
 * Calculate the great-circle distance between two points on Earth
 * using the Haversine formula.
 *
 * @param lat1 - Latitude of point 1 in degrees
 * @param lng1 - Longitude of point 1 in degrees
 * @param lat2 - Latitude of point 2 in degrees
 * @param lng2 - Longitude of point 2 in degrees
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate estimated delivery time based on distance and real-time traffic conditions.
 *
 * @param distanceKm - Straight-line great-circle distance in kilometers
 * @param baseMinMin - Minimum base delivery time in minutes
 * @param baseMinMax - Maximum base delivery time in minutes
 * @returns { min, max } estimated minutes
 */
export function estimateDeliveryTime(
  distanceKm: number,
  baseMinMin: number = 8,
  baseMinMax: number = 15,
): { min: number; max: number } {
  // 1. Convert straight-line distance to road distance using routing circuity multiplier (approx 1.4x in Indian cities)
  const roadDistance = distanceKm * 1.4;

  // 2. Base travel speed: ~24 km/h (covers normal urban driving speeds in India)
  // Travel time in minutes = (roadDistance / 24) * 60 = roadDistance * 2.5
  const baseTravelMinutes = roadDistance * 2.5;

  // 3. Traffic multiplier depending on the hour of the day (India Standard Time)
  let trafficFactor = 1.1; // Default normal hours
  
  if (typeof window === "undefined") {
    // Only calculate server-side to avoid hydration mismatch
    try {
      const now = new Date();
      const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const hour = nowIST.getHours();

      if (hour >= 8 && hour < 11.5) {
        trafficFactor = 1.4; // Morning rush traffic
      } else if (hour >= 17 && hour < 20.5) {
        trafficFactor = 1.5; // Evening peak traffic
      } else if (hour >= 23 || hour < 5) {
        trafficFactor = 0.8; // Night clear roads (faster)
      }
    } catch {
      // fallback to default
    }
  }

  const travelMinutes = baseTravelMinutes * trafficFactor;

  // 4. Dark store order picking & packaging preparation overhead (typically 4 minutes flat)
  const prepTime = 4;

  // Calculate realistic ranges (min and max)
  const minEta = Math.round(prepTime + travelMinutes);
  const maxEta = Math.round(7 + travelMinutes * 1.25);

  return {
    min: Math.max(baseMinMin, minEta),
    max: Math.max(baseMinMax, maxEta),
  };
}
