// src/app/api/location/check-pincode/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";

/**
 * GET /api/location/check-pincode?pincode=826001
 *
 * Quick serviceability check by pincode — checks if any store covers the pincode.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(req.url);
    const pincode = searchParams.get("pincode") || "";

    if (!pincode || pincode.length < 4) {
      return NextResponse.json(
        { error: "Valid pincode is required" },
        { status: 400 },
      );
    }

    // Check if any active store is in or near this pincode
    const storesInPincode = await Store.find({
      status: "active",
      "location.pincode": pincode,
    }).lean();

    if (storesInPincode.length > 0) {
      return NextResponse.json({
        success: true,
        serviceable: true,
        status: "serviceable",
        stores: storesInPincode.map((s: any) => ({
          _id: s._id,
          name: s.name,
          city: s.location.city,
        })),
      });
    }

    // If no exact pincode match, check nearby pincodes (first 3 digits match)
    const pincodePrefix = pincode.slice(0, 3);
    const nearbyStores = await Store.find({
      status: "active",
      "location.pincode": { $regex: `^${pincodePrefix}` },
    }).lean();

    if (nearbyStores.length > 0) {
      return NextResponse.json({
        success: true,
        serviceable: false,
        status: "limited",
        message:
          "We're not in your exact pincode yet, but we're nearby!",
        nearbyStores: nearbyStores.map((s: any) => ({
          name: s.name,
          city: s.location.city,
          pincode: s.location.pincode,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      serviceable: false,
      status: "not_serviceable",
      message:
        "We're not available in your area yet. We'll notify you when we arrive!",
    });
  } catch (error: any) {
    console.error("GET /api/location/check-pincode ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check pincode" },
      { status: 500 },
    );
  }
}
