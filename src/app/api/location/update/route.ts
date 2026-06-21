// src/app/api/location/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import Address from "@/models/address.model";

/**
 * POST /api/location/update
 *
 * Saves/updates the user's current delivery location.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    await connectDb();

    const body = await req.json();
    const { latitude, longitude, fullAddress, city, state, pincode, label } =
      body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 },
      );
    }

    // Unset any existing default
    await Address.updateMany(
      { user: session.user.id, isDefault: true },
      { $set: { isDefault: false } },
    );

    // Upsert the current location as default address
    const address = await Address.findOneAndUpdate(
      { user: session.user.id, isDefault: true },
      {
        $set: {
          street: fullAddress || `${latitude}, ${longitude}`,
          fullAddress: fullAddress || "",
          city: city || "",
          state: state || "",
          zipCode: pincode || "",
          country: "India",
          latitude,
          longitude,
          isDefault: true,
          type: "home",
          label: label || "Current Location",
        },
        $setOnInsert: {
          user: session.user.id,
        },
      },
      { upsert: true, new: true },
    );

    return NextResponse.json({ success: true, address });
  } catch (error: any) {
    console.error("POST /api/location/update ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update location" },
      { status: 500 },
    );
  }
}
