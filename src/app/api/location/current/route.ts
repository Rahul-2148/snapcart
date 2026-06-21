// src/app/api/location/current/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import Address from "@/models/address.model";

/**
 * GET /api/location/current
 *
 * Returns the authenticated user's default/saved address from DB.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ address: null, message: "Not authenticated" });
    }

    await connectDb();

    // Find default address or most recently updated address
    let address = await Address.findOne({
      user: session.user.id,
      isDefault: true,
    }).lean();

    if (!address) {
      address = await Address.findOne({ user: session.user.id })
        .sort({ updatedAt: -1 })
        .lean();
    }

    return NextResponse.json({ success: true, address });
  } catch (error: any) {
    console.error("GET /api/location/current ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch current location" },
      { status: 500 },
    );
  }
}
