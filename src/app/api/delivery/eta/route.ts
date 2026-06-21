// src/app/api/delivery/eta/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";
import { haversineDistance, estimateDeliveryTime } from "@/lib/utils/haversine";

/**
 * GET /api/delivery/eta?storeId=X&lat=Y&lng=Z
 *
 * Calculates estimated delivery time based on distance between store and user.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId") || "";
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");

    if (!storeId || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "storeId, lat, and lng are required" },
        { status: 400 },
      );
    }

    const store = await Store.findById(storeId).lean() as any;
    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 },
      );
    }

    const [storeLng, storeLat] = store.location.coordinates;
    const distanceKm = haversineDistance(lat, lng, storeLat, storeLng);

    const eta = estimateDeliveryTime(
      distanceKm,
      store.estimatedDeliveryMinutes?.min || 8,
      store.estimatedDeliveryMinutes?.max || 15,
    );

    return NextResponse.json({
      success: true,
      min: eta.min,
      max: eta.max,
      distanceKm: Math.round(distanceKm * 10) / 10,
      storeName: store.name,
    });
  } catch (error: any) {
    console.error("GET /api/delivery/eta ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate ETA" },
      { status: 500 },
    );
  }
}
