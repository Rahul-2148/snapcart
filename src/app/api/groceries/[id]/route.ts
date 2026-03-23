import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDb from "@/lib/server/db";
import { Grocery } from "@/models/grocery.model";

// register models used in population
import "@/models/category.model";
import "@/models/groceryVariant.model";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDb();
    const { id: routeId } = await params;
    
    // Get ID - try multiple ways to access it
    let id = routeId;
    
    // If params is not directly accessible, try from URL
    if (!id) {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      id = pathParts[pathParts.length - 1];
    }
    
    console.log(`[GET Grocery] Full Params:`, JSON.stringify({ id: routeId }));
    console.log(`[GET Grocery] ID: "${id}", Type: ${typeof id}, Length: ${String(id)?.length}`);
    
    // Validate ID exists
    if (!id) {
      console.error("[GET Grocery] No ID provided");
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
        { status: 400 },
      );
    }
    
    // Convert to string and trim
    const idString = String(id).trim();
    console.log(`[GET Grocery] Trimmed ID: "${idString}", Length: ${idString.length}`);
    
    // Check if it's a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(idString)) {
      console.error(`[GET Grocery] Invalid ObjectId format: "${idString}"`);
      return NextResponse.json(
        { success: false, message: `Invalid product ID: ${idString}` },
        { status: 400 },
      );
    }

    console.log(`[GET Grocery] Searching for product with ID: ${idString}`);
    
    const grocery = await Grocery.findById(idString)
      .populate("category", "name allowedUnits")
      .populate({
        path: "variants",
        model: "GroceryVariant",
        select: "label variantName unit price countInStock isDefault cod",
      });

    if (!grocery) {
      console.log(`[GET Grocery] Product not found for ID: ${idString}`);
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 },
      );
    }

    console.log(`[GET Grocery] ✅ Found product: ${grocery.name}`);
    return NextResponse.json({ success: true, grocery: grocery.toObject() });
  } catch (error: any) {
    console.error(`[GET Grocery] Error:`, error);
    return NextResponse.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 },
    );
  }
}
