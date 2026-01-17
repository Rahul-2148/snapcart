// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Category } from "@/models/category.model";

export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const categories = await Category.find({ isActive: true })
      .select("_id name allowedUnits")
      .sort({ name: 1 });

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