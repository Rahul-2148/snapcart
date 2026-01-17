// src/app/api/admin/reset-categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Category } from "@/models/category.model";

export async function GET(req: NextRequest) {
  try {
    await connectDb();

    console.log("🗑️ Resetting categories collection...");
    
    // Delete all categories
    const result = await Category.deleteMany({});
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} categories`,
      deletedCount: result.deletedCount,
    });
    
  } catch (error) {
    console.error("RESET CATEGORIES ERROR:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to reset categories",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}