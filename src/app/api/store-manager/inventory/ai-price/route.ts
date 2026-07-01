// src/app/api/store-manager/inventory/ai-price/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isManager = session?.user?.roles?.includes("storeManager");
    const isAdmin = session?.user?.roles?.includes("admin");

    if (!session || (!isManager && !isAdmin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const body = await req.json();
    const { variantId, basePrice, stock, demandSurge, weatherMultiplier, competitorPrice } = body;

    if (!variantId) {
      return NextResponse.json({ error: "VariantId is required" }, { status: 400 });
    }

    let dynamicPrice = basePrice;
    let fallback = false;

    try {
      const ML_ENGINE_URL = (process.env.ML_ENGINE_URL || "http://localhost:8000").replace(/\/$/, "");
      const response = await fetch(`${ML_ENGINE_URL}/predict/pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_price: Number(basePrice) || 100,
          stock: Number(stock) || 0,
          demand_surge: Number(demandSurge) || 1.0,
          weather_multiplier: Number(weatherMultiplier) || 1.0,
          competitor_price: competitorPrice ? Number(competitorPrice) : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        dynamicPrice = data.dynamic_price;
      } else {
        fallback = true;
      }
    } catch (err) {
      console.warn("ML engine pricing endpoint failed, running fallback:", err);
      fallback = true;
    }

    if (fallback) {
      // Local pricing optimization math matching python engine
      let price = Number(basePrice) || 100;
      const numStock = Number(stock) || 0;
      if (numStock < 5) price *= 1.2;
      else if (numStock < 15) price *= 1.08;
      
      const surge = Math.max(1.0, Math.min(2.5, (Number(demandSurge) || 1.0) * (Number(weatherMultiplier) || 1.0)));
      price *= surge;
      
      if (competitorPrice && price > Number(competitorPrice) * 1.15) {
        price = Number(competitorPrice) * 1.15;
      }
      dynamicPrice = Math.round(price * 100) / 100;
    }

    return NextResponse.json({ success: true, dynamicPrice, fallback });
  } catch (error: any) {
    console.error("AI Price endpoint error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
