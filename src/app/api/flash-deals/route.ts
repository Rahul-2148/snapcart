// src/app/api/flash-deals/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { FlashDeal } from "@/models/flashDeal.model";

// Register related models for population
import "@/models/grocery.model";
import "@/models/groceryVariant.model";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  console.log("=== API FLASH DEALS ROUTE CALLED ===");
  try {
    await connectDb();

    const now = new Date();

    // Query active flash deals where current time is between start and end
    // and limit is not exceeded (soldCount < dealStock) and isActive is true
    const activeDeals = await FlashDeal.find({
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
      $expr: { $lt: ["$soldCount", "$dealStock"] },
    })
      .populate({
        path: "groceryVariant",
        populate: {
          path: "grocery",
          select: "name brand images category description",
        },
      })
      .lean();

    console.log("=== [API ROUTE] activeDeals query output ===", JSON.stringify(activeDeals, null, 2));

    return NextResponse.json({
      success: true,
      deals: activeDeals,
    });
  } catch (error: any) {
    console.error("Failed to fetch active flash deals:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load active flash deals",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
