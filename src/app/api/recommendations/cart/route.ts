import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Grocery } from "@/models/grocery.model";
import mongoose from "mongoose";
import "@/models/grocery.model";
import "@/models/groceryVariant.model";

export const dynamic = "force-dynamic";

// Association Mapping Rules (Category ID to recommended Category IDs)
const ASSOCIATION_RULES: { [categoryId: string]: string[] } = {
  // Dairy & Eggs category (69872edf5ed0786641a6d562) -> suggests Bakery & Breads, Beverages, Dairy & Eggs (other items)
  "69872edf5ed0786641a6d562": [
    "69872edf5ed0786641a6d574", // Bakery & Breads
    "69872edf5ed0786641a6d56a", // Beverages & Drinks
    "69872edf5ed0786641a6d562", // Dairy & Eggs
  ],
  // Bakery & Breads category (69872edf5ed0786641a6d574) -> suggests Dairy & Eggs, Beverages, Sweets
  "69872edf5ed0786641a6d574": [
    "69872edf5ed0786641a6d562", // Dairy & Eggs
    "69872edf5ed0786641a6d56a", // Beverages & Drinks
    "69872edf5ed0786641a6d576", // Sweets & Chocolates
  ],
  // Rice, Atta & Grains (69872edf5ed0786641a6d564) -> suggests Oil & Ghee, Spices & Condiments, Rice, Atta & Grains (other items)
  "69872edf5ed0786641a6d564": [
    "69872edf5ed0786641a6d566", // Oil & Ghee
    "69872edf5ed0786641a6d56e", // Spices & Condiments
    "69872edf5ed0786641a6d564", // Rice, Atta & Grains
  ],
  // Oil & Ghee (69872edf5ed0786641a6d566) -> suggests Rice, Atta & Grains, Spices & Condiments
  "69872edf5ed0786641a6d566": [
    "69872edf5ed0786641a6d564", // Rice, Atta & Grains
    "69872edf5ed0786641a6d56e", // Spices & Condiments
  ],
  // Snacks & Biscuits (69872edf5ed0786641a6d568) -> suggests Beverages & Drinks, Sweets & Chocolates, Snacks & Biscuits (other items)
  "69872edf5ed0786641a6d568": [
    "69872edf5ed0786641a6d56a", // Beverages & Drinks
    "69872edf5ed0786641a6d576", // Sweets & Chocolates
    "69872edf5ed0786641a6d568", // Snacks & Biscuits
  ],
  // Beverages & Drinks (69872edf5ed0786641a6d56a) -> suggests Snacks & Biscuits, Sweets & Chocolates
  "69872edf5ed0786641a6d56a": [
    "69872edf5ed0786641a6d568", // Snacks & Biscuits
    "69872edf5ed0786641a6d576", // Sweets & Chocolates
  ],
  // Fruits & Vegetables (69872ede5ed0786641a6d560) -> suggests Fruits & Vegetables
  "69872ede5ed0786641a6d560": [
    "69872ede5ed0786641a6d560", // Fruits & Vegetables
  ],
};

// Default high-frequency items (fallback essentials)
const DEFAULT_ESSENTIAL_NAMES = [
  "Coriander Bunch",
  "Fresh Bread",
  "Amul Milk",
  "Potato Chips",
  "Fresh Eggs",
  "Salted Butter",
];

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const { cartItems } = await req.json();

    if (!Array.isArray(cartItems)) {
      return NextResponse.json({ success: false, message: "Invalid cartItems list" }, { status: 400 });
    }

    // Extract already in-cart grocery product IDs and category IDs
    const inCartGroceryIds = new Set<string>();
    const inCartCategoryIds = new Set<string>();

    cartItems.forEach((item: any) => {
      const groceryId = item.variant?.grocery?._id || item.variant?.grocery;
      if (groceryId) inCartGroceryIds.add(groceryId.toString());

      const categoryId = item.variant?.grocery?.category || item.category;
      if (categoryId) inCartCategoryIds.add(categoryId.toString());
    });

    console.log("=== [RECOMMENDATIONS API] inCartGroceryIds ===", Array.from(inCartGroceryIds));
    console.log("=== [RECOMMENDATIONS API] inCartCategoryIds ===", Array.from(inCartCategoryIds));

    // Determine target categories based on association rules
    const targetCategoryIds = new Set<string>();
    inCartCategoryIds.forEach((catId) => {
      const associated = ASSOCIATION_RULES[catId];
      if (associated) {
        associated.forEach((aId) => targetCategoryIds.add(aId));
      }
    });

    console.log("=== [RECOMMENDATIONS API] targetCategoryIds ===", Array.from(targetCategoryIds));

    let recommendedGroceries: any[] = [];

    // Query primary matches if we have target categories
    if (targetCategoryIds.size > 0) {
      const targetCategoryObjectIds = Array.from(targetCategoryIds).map((id) => new mongoose.Types.ObjectId(id));
      const inCartGroceryObjectIds = Array.from(inCartGroceryIds).map((id) => new mongoose.Types.ObjectId(id));

      recommendedGroceries = await Grocery.find({
        category: { $in: targetCategoryObjectIds },
        _id: { $nin: inCartGroceryObjectIds },
        isActive: true,
      })
        .populate("variants")
        .limit(6)
        .lean();
    }

    console.log("=== [RECOMMENDATIONS API] primary matches count ===", recommendedGroceries.length);

    // If we have fewer than 6 recommendations, fill the remaining with default high-frequency essentials
    if (recommendedGroceries.length < 6) {
      const missingCount = 6 - recommendedGroceries.length;
      
      // Get IDs of items already recommended to avoid duplicates
      const recommendedIds = new Set(recommendedGroceries.map((g) => g._id.toString()));
      const excludeIds = new Set([...Array.from(inCartGroceryIds), ...Array.from(recommendedIds)]);
      const excludeObjectIds = Array.from(excludeIds).map((id) => new mongoose.Types.ObjectId(id));

      console.log("=== [RECOMMENDATIONS API] excludeObjectIds for fallback ===", Array.from(excludeIds));

      const fallbackGroceries = await Grocery.find({
        name: { $in: DEFAULT_ESSENTIAL_NAMES },
        _id: { $nin: excludeObjectIds },
        isActive: true,
      })
        .populate("variants")
        .limit(missingCount)
        .lean();

      recommendedGroceries = [...recommendedGroceries, ...fallbackGroceries];
    }

    // Filter out products that have no variants or are out of stock
    const filteredRecommendations = recommendedGroceries.filter((g) => {
      return g.variants && g.variants.length > 0;
    }).slice(0, 6);

    return NextResponse.json({
      success: true,
      recommendations: filteredRecommendations,
    });
  } catch (error: any) {
    console.error("Cart recommendations API error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load recommendations" },
      { status: 500 }
    );
  }
}
