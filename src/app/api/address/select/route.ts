// src/app/api/address/select/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import Address from "@/models/address.model";

/**
 * POST /api/address/select
 *
 * Sets a saved address as the active delivery location.
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
    const { addressId } = body;

    if (!addressId) {
      return NextResponse.json(
        { error: "addressId is required" },
        { status: 400 },
      );
    }

    // Verify the address belongs to the user
    const address = await Address.findOne({
      _id: addressId,
      user: session.user.id,
    });

    if (!address) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 },
      );
    }

    // Unset all other defaults
    await Address.updateMany(
      { user: session.user.id, _id: { $ne: addressId } },
      { $set: { isDefault: false } },
    );

    // Set this address as default
    address.isDefault = true;
    await address.save();

    return NextResponse.json({
      success: true,
      address: address.toJSON(),
    });
  } catch (error: any) {
    console.error("POST /api/address/select ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to select address" },
      { status: 500 },
    );
  }
}
