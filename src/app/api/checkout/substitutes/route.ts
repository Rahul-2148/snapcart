// src/app/api/checkout/substitutes/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Grocery } from "@/models/grocery.model";
import { GroceryVariant } from "@/models/groceryVariant.model";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json({ substitutes: [] });
    }

    await connectDb();

    // Find groceries in the same category
    const groceries = await Grocery.find({ category: categoryId, isActive: true }).select("name");
    const groceryIds = groceries.map((g) => g._id);

    // Find all variants for these groceries
    const variants = await GroceryVariant.find({
      grocery: { $in: groceryIds },
      countInStock: { $gt: 0 },
    })
      .populate("grocery", "name")
      .select("label price countInStock grocery")
      .lean();

    const substitutes = variants.map((v: any) => ({
      variantId: v._id.toString(),
      label: v.label,
      price: v.price,
      name: `${v.grocery?.name || "Grocery"} - ${v.label}`,
    }));

    return NextResponse.json({ substitutes });
  } catch (error: any) {
    console.error("Substitutes API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
