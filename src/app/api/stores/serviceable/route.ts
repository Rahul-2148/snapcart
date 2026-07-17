// src/app/api/stores/serviceable/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";
import { DeliverySettings } from "@/models/deliverySettings.model";
import { haversineDistance, estimateDeliveryTime } from "@/lib/utils/haversine";

/**
 * GET /api/stores/serviceable?lat=X&lng=Y
 *
 * Checks if ANY active store services the given coordinates.
 * Returns serviceability status and nearest store if serviceable.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Missing or invalid lat/lng parameters" },
        { status: 400 },
      );
    }

    // Find all active stores and calculate distances
    const stores = await Store.find({ status: "active" }).lean();

    const storesWithDistance = stores
      .map((store: any) => {
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

        return { ...store, isOpen, distanceKm };
      })
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    // Load delivery settings to check if universal delivery mode is enabled
    const settings = await DeliverySettings.findOne().lean();
    const isUniversal = settings?.universalDeliveryMode === true;

    // Check which stores serve this location (within their service radius)
    const serviceableStores = isUniversal
      ? storesWithDistance
      : storesWithDistance.filter((s: any) => s.distanceKm <= s.serviceRadiusKm);

    if (serviceableStores.length === 0) {
      return NextResponse.json({
        success: true,
        serviceable: false,
        status: "not_serviceable",
        message: "We're not available in your area yet.",
        nearestStore: storesWithDistance[0]
          ? {
              name: storesWithDistance[0].name,
              distanceKm:
                Math.round(storesWithDistance[0].distanceKm * 10) / 10,
              city: storesWithDistance[0].location?.city,
            }
          : null,
      });
    }

    // Find open serviceable stores
    const openStores = serviceableStores.filter((s: any) => s.isOpen);

    if (openStores.length === 0) {
      return NextResponse.json({
        success: true,
        serviceable: true,
        status: "limited",
        message: "Stores in your area are currently closed.",
        stores: serviceableStores.map((s: any) => ({
          _id: s._id,
          name: s.name,
          distanceKm: Math.round(s.distanceKm * 10) / 10,
          isOpen: false,
          openingHours: s.openingHours,
        })),
      });
    }

    const nearest = openStores[0];
    const eta = estimateDeliveryTime(
      nearest.distanceKm,
      nearest.estimatedDeliveryMinutes?.min || 8,
      nearest.estimatedDeliveryMinutes?.max || 15,
    );

    return NextResponse.json({
      success: true,
      serviceable: true,
      status: "serviceable",
      nearestStore: {
        _id: nearest._id,
        name: nearest.name,
        distanceKm: Math.round(nearest.distanceKm * 10) / 10,
        isOpen: true,
        estimatedDeliveryMinutes: eta,
        deliveryFee: nearest.deliveryFee,
      },
      totalServiceable: serviceableStores.length,
    });
  } catch (error: any) {
    console.error("GET /api/stores/serviceable ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check serviceability" },
      { status: 500 },
    );
  }
}
