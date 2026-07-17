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
    let activeDeals = await FlashDeal.find({
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

    // If no active deals, dynamically auto-seed 5-6 deals from active inventory
    // setting expiration to the end of the current hour (creating a rolling 1-hour flash deal loop)
    if (activeDeals.length === 0) {
      const { GroceryVariant } = await import("@/models/groceryVariant.model");
      
      const allVariants = await GroceryVariant.find({
        countInStock: { $gt: 5 }
      })
        .populate("grocery")
        .limit(50)
        .lean();

      const validVariants = allVariants.filter(
        (v: any) => v.grocery && v.grocery.isActive
      );

      if (validVariants.length > 0) {
        const shuffled = validVariants.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 6);

        const startTime = new Date();
        const endTime = new Date();
        endTime.setHours(endTime.getHours() + 1, 0, 0, 0); // End of the current hour

        const newDealsToInsert = selected.map((variant: any) => {
          // 40% to 50% discount
          const discountPercent = 40 + Math.floor(Math.random() * 11);
          const flashPrice = Math.round(variant.price.selling * (1 - discountPercent / 100));

          return {
            groceryVariant: variant._id,
            flashPrice: Math.max(1, flashPrice),
            startTime,
            endTime,
            dealStock: 15 + Math.floor(Math.random() * 20), // 15 to 35 items
            soldCount: Math.floor(Math.random() * 5), // 0 to 5 sold
            limitPerUser: 2,
            isActive: true,
          };
        });

        await FlashDeal.insertMany(newDealsToInsert);

        activeDeals = await FlashDeal.find({
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
      }
    }

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
