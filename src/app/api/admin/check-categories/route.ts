// src/app/api/admin/check-categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Category } from "@/models/category.model";

export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const categories = await Category.find({})
      .select("_id name slug allowedUnits isActive")
      .sort({ name: 1 });
    
    return NextResponse.json({
      success: true,
      count: categories.length,
      categories,
    });
    
  } catch (error) {
    console.error("CHECK CATEGORIES ERROR:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to check categories",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}