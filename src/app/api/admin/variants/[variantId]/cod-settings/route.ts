/**
 * Admin endpoint to update COD settings for a product variant
 * PUT /api/admin/variants/{variantId}/cod-settings
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { User } from "@/models/user.model";

export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ variantId: string }> },
) => {
  try {
    await connectDb();

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const admin = await User.findOne({ email: session.user.email });
    if (!admin || !admin.roles?.includes("admin")) {
      return NextResponse.json(
        { message: "Only admins can update COD settings" },
        { status: 403 },
      );
    }

    const { isCodAllowed, handlingCharge } = await req.json();

    if (typeof isCodAllowed !== "boolean") {
      return NextResponse.json(
        { message: "isCodAllowed must be a boolean" },
        { status: 400 },
      );
    }

    if (typeof handlingCharge !== "number" || handlingCharge < 0) {
      return NextResponse.json(
        { message: "handlingCharge must be a non-negative number" },
        { status: 400 },
      );
    }

    // Await params to extract variantId
    const { variantId } = await params;
    console.log(`[COD API] Updating variant: ${variantId}`, {
      isCodAllowed,
      handlingCharge,
    });

    // First, get the variant to check if cod field exists
    const existingVariant = await GroceryVariant.findById(variantId);
    if (!existingVariant) {
      console.log(`[COD API] Variant not found: ${variantId}`);
      return NextResponse.json(
        { message: "Variant not found" },
        { status: 404 },
      );
    }

    // Initialize cod object if it doesn't exist
    if (!existingVariant.cod) {
      existingVariant.cod = {
        isCodAllowed: true,
        handlingCharge: 0,
      };
    }

    // Update cod settings
    existingVariant.cod.isCodAllowed = isCodAllowed;
    existingVariant.cod.handlingCharge = isCodAllowed ? handlingCharge : 0;

    // Save the variant
    const updatedVariant = await existingVariant.save();

    console.log(`[COD API] Variant updated successfully:`, {
      variantId: updatedVariant._id,
      cod: updatedVariant.cod,
    });

    return NextResponse.json(
      {
        success: true,
        message: "COD settings updated successfully",
        variant: updatedVariant,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[COD API] Error:", error);
    return NextResponse.json(
      { message: `Failed to update COD settings: ${error.message}` },
      { status: 500 },
    );
  }
};
