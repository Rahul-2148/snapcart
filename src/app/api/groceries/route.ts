// src/app/api/groceries/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Grocery } from "@/models/grocery.model";

// 🔥 register related models
import "@/models/category.model";
import "@/models/groceryVariant.model";

export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const getBrands = searchParams.get("getBrands") === "true";

    const query: any = { isActive: true };
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    if (category) {
      // Normalize slug: lowercase, replace spaces/underscores with dashes
      let categoryId = category;
      const mongoose = (await import("mongoose")).default;
      let found = null;
      if (!mongoose.Types.ObjectId.isValid(category)) {
        const normalizedSlug = category
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/_+/g, "-");
        const { Category } = await import("@/models/category.model");
        found = await Category.findOne({ slug: normalizedSlug });
        if (found) {
          categoryId = found._id;
        } else {
          // No such category, return empty groceries array
          return NextResponse.json({ success: true, groceries: [] });
        }
      } else {
        categoryId = new mongoose.Types.ObjectId(category);
      }
      if (categoryId) {
        query.category = categoryId;
      }
    }

    // If getting brands for a category
    if (getBrands && category) {
      const brands = await Grocery.distinct("brand", {
        category,
        isActive: true,
      });
      return NextResponse.json({
        success: true,
        brands: brands.filter(Boolean).sort(),
      });
    }

    const groceries = await Grocery.find(query)
      .populate("category", "name allowedUnits")
      .populate({
        path: "variants",
        model: "GroceryVariant",
        select: "label variantName unit price countInStock isDefault cod",
      })
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      groceries,
    });
  } catch (error: any) {
    console.error("GET GROCERIES ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to fetch groceries: ${error.message}`,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
