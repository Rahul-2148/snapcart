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
 * Calculate estimated delivery time based on distance.
 *
 * @param distanceKm - Distance in kilometers
 * @param baseMinMin - Minimum base delivery time in minutes
 * @param baseMinMax - Maximum base delivery time in minutes
 * @returns { min, max } estimated minutes
 */
export function estimateDeliveryTime(
  distanceKm: number,
  baseMinMin: number = 8,
  baseMinMax: number = 15,
): { min: number; max: number } {
  // Add ~2 minutes per km beyond 1km
  const extraMinutes = Math.max(0, Math.floor((distanceKm - 1) * 2));

  return {
    min: baseMinMin + extraMinutes,
    max: baseMinMax + extraMinutes,
  };
}
