// src/app/api/stores/nearby/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";
import { DeliverySettings } from "@/models/deliverySettings.model";
import { haversineDistance } from "@/lib/utils/haversine";

/**
 * GET /api/stores/nearby?lat=X&lng=Y&radiusKm=15
 *
 * Finds active stores near the given coordinates using MongoDB $nearSphere.
 * Returns stores sorted by distance with computed distanceKm.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    const radiusKm = parseFloat(searchParams.get("radiusKm") || "50");

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Missing or invalid lat/lng parameters" },
        { status: 400 },
      );
    }

    // Load delivery settings to check if universal delivery mode is enabled
    const settings = await DeliverySettings.findOne().lean();
    const isUniversal = settings?.universalDeliveryMode === true;

    // Convert radius to meters for MongoDB. If universal delivery mode is enabled, search up to 20,000 km
    const radiusMeters = isUniversal ? 20000000 : radiusKm * 1000;

    // Find stores within radius using 2dsphere index
    const stores = await Store.find({
      status: "active",
      "location.coordinates": {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat], // MongoDB GeoJSON: [longitude, latitude]
          },
          $maxDistance: radiusMeters,
        },
      },
    }).lean();

    // Calculate actual distance and add to results
    const storesWithDistance = stores.map((store: any) => {
      const [storeLng, storeLat] = store.location.coordinates;
      const distanceKm = haversineDistance(lat, lng, storeLat, storeLng);

      // Compute isOpen manually because .lean() excludes virtual fields
      const now = new Date();
      const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const hours = nowIST.getHours();
      const minutes = nowIST.getMinutes();
      const currentTime = hours * 60 + minutes;

      const openHours = store.openingHours?.open || "06:00";
      const closeHours = store.openingHours?.close || "23:00";

      const [openH, openM] = openHours.split(":").map(Number);
      const [closeH, closeM] = closeHours.split(":").map(Number);
      const openTime = openH * 60 + openM;
      const closeTime = closeH * 60 + closeM;

      let isOpen = false;
      if (closeTime < openTime) {
        isOpen = currentTime >= openTime || currentTime <= closeTime;
      } else {
        isOpen = currentTime >= openTime && currentTime <= closeTime;
      }

      if (store.status !== "active") {
        isOpen = false;
      }

      return {
        ...store,
        isOpen,
        distanceKm: Math.round(distanceKm * 10) / 10, // 1 decimal place
      };
    });

    // Sort by distance (nearest first)
    storesWithDistance.sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    // Determine serviceability status
    let serviceableStatus = "not_serviceable";
    const serviceableStores = isUniversal
      ? storesWithDistance
      : storesWithDistance.filter((s: any) => s.distanceKm <= s.serviceRadiusKm);

    if (serviceableStores.length > 0) {
      const hasOpenStore = serviceableStores.some((s: any) => s.isOpen);
      serviceableStatus = hasOpenStore ? "serviceable" : "limited";
    }

    return NextResponse.json({
      success: true,
      stores: storesWithDistance,
      serviceableStatus,
      universalDeliveryMode: isUniversal,
      totalFound: storesWithDistance.length,
    });
  } catch (error: any) {
    console.error("GET /api/stores/nearby ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch nearby stores" },
      { status: 500 },
    );
  }
}
