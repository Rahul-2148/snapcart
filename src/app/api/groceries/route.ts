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

    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const groceries = await Grocery.find(query)
      .populate("category", "name allowedUnits")
      .populate({
        path: "variants",
        model: "GroceryVariant",
      })
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      groceries,
    });
  } catch (error) {
    console.error("GET GROCERIES ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch groceries",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
