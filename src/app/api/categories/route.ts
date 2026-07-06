// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Category } from "@/models/category.model";

let cachedCategories: any = null;
let lastFetchedCategories = 0;

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
    // Cache for 30 seconds
    if (cachedCategories && now - lastFetchedCategories < 30000) {
      return NextResponse.json({
        success: true,
        categories: cachedCategories,
      });
    }

    await connectDb();

    const categories = await Category.find({ isActive: true })
      .select("_id name allowedUnits")
      .sort({ name: 1 })
      .lean();

    cachedCategories = categories;
    lastFetchedCategories = now;

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch categories",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}