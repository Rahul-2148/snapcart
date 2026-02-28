// src/app/api/admin/migrations/cleanup-cod-fields/route.ts
import connectToDB from "@/lib/server/db";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { NextRequest, NextResponse } from "next/server";

/**
 * Migration to clean up COD fields on GroceryVariants
 * Removes per-product handlingCharge field (replaced with global flat fee)
 * Keeps only isCodAllowed boolean flag
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDB();

    // Find all variants with handlingCharge field and remove it
    const result = await GroceryVariant.updateMany(
      { "cod.handlingCharge": { $exists: true } },
      {
        $unset: { "cod.handlingCharge": "" },
      },
    );

    // Ensure all variants have cod.isCodAllowed set to true if missing
    const ensureIsCodAllowed = await GroceryVariant.updateMany(
      { "cod.isCodAllowed": { $exists: false } },
      {
        $set: { "cod.isCodAllowed": true },
      },
    );

    return NextResponse.json(
      {
        success: true,
        message: "COD fields cleaned up successfully",
        variantsUpdated: result.modifiedCount,
        variantsEnsured: ensureIsCodAllowed.modifiedCount,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error cleaning COD fields:", error);
    return NextResponse.json(
      { success: false, error: `Failed to clean COD fields: ${error.message}` },
      { status: 500 },
    );
  }
}
