// src/lib/services/location.service.ts

import { haversineDistance } from "@/lib/utils/haversine";

export interface AddressDetails {
  fullAddress: string;
  area: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface NearbyStoreResponse {
  stores: any[];
  serviceableStatus: "serviceable" | "limited" | "not_serviceable" | "checking" | "unknown";
}

/**
 * Reverse geocode latitude and longitude using SnapCart's geocode API.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<AddressDetails> {
  const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`);
  if (!res.ok) {
    throw new Error("Failed to reverse geocode coordinates");
  }
  const data = await res.json();
  const addr = data.address || {};
  
  return {
    fullAddress: data.display_name || "",
    area:
      addr.suburb ||
      addr.neighbourhood ||
      addr.hamlet ||
      addr.village ||
      addr.town ||
      "",
    city:
      addr.city ||
      addr.town ||
      addr.village ||
      addr.county ||
      addr.state_district ||
      "",
    state: addr.state || "",
    country: addr.country || "India",
    pincode: addr.postcode || "",
  };
}

/**
 * Fetch nearby stores from SnapCart's store discovery API.
 */
export async function fetchNearbyStores(
  lat: number,
  lng: number,
  radiusKm?: number
): Promise<NearbyStoreResponse> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
  });
  if (radiusKm) {
    params.set("radiusKm", radiusKm.toString());
  }

  const res = await fetch(`/api/stores/nearby?${params}`);
  if (!res.ok) {
    throw new Error("Failed to fetch nearby stores");
  }
  const data = await res.json();
  return {
    stores: data.stores || [],
    serviceableStatus: data.serviceableStatus || "unknown",
  };
}

/**
 * Check serviceability of coordinates.
 */
export async function checkServiceability(lat: number, lng: number): Promise<any> {
  const res = await fetch(`/api/stores/serviceable?lat=${lat}&lng=${lng}`);
  if (!res.ok) {
    throw new Error("Failed to check serviceability");
  }
  return await res.json();
}

/**
 * Fetch delivery ETA between a store and user coordinates.
 */
export async function fetchDeliveryEta(
  storeId: string,
  lat: number,
  lng: number
): Promise<{ min: number; max: number }> {
  const params = new URLSearchParams({
    storeId,
    lat: lat.toString(),
    lng: lng.toString(),
  });
  const res = await fetch(`/api/delivery/eta?${params}`);
  if (!res.ok) {
    throw new Error("Failed to fetch delivery ETA");
  }
  const data = await res.json();
  return { min: data.min, max: data.max };
}

/**
 * Check if a given pincode is serviceable.
 */
export async function checkPincodeServiceability(pincode: string): Promise<{ serviceable: boolean }> {
  const res = await fetch(`/api/location/check-pincode?pincode=${pincode}`);
  if (!res.ok) {
    throw new Error("Failed to check pincode serviceability");
  }
  return await res.json();
}

/**
 * Select the optimal store from list of stores.
 * Priority: nearest -> fastest delivery -> highest stock
 */
export function selectOptimalStore(stores: any[]): any | null {
  const activeStores = stores.filter((s) => s.status === "active" && s.isOpen);
  if (activeStores.length === 0) return null;
  
  // Sort by distance (first criteria) and then delivery speed
  return activeStores.sort((a, b) => {
    if (a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }
    const etaA = a.estimatedDeliveryMinutes?.min || 0;
    const etaB = b.estimatedDeliveryMinutes?.min || 0;
    return etaA - etaB;
  })[0];
}

/**
 * Calculate distance in kilometers using client-side Haversine formula.
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversineDistance(lat1, lng1, lat2, lng2);
}
