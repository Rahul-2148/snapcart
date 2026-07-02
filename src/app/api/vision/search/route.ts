import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { Grocery } from "@/models/grocery.model";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds timeout for Vercel Serverless Function to allow Render cold start

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const k = formData.get("k") || "5";

    if (!file) {
      return NextResponse.json({ success: false, message: "No image file provided" }, { status: 400 });
    }

    // Forward the file upload to FastAPI
    const fastapiFormData = new FormData();
    fastapiFormData.append("file", file);
    fastapiFormData.append("k", k);

    const ML_ENGINE_URL = (process.env.ML_ENGINE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
    const fastapiRes = await fetch(`${ML_ENGINE_URL}/vision/search`, {
      method: "POST",
      body: fastapiFormData,
    });

    if (!fastapiRes.ok) {
      const errText = await fastapiRes.text();
      return NextResponse.json({ success: false, message: `FastAPI responded with error: ${errText}` }, { status: 500 });
    }

    const data = await fastapiRes.json();
    const matches = data.matches || [];

    await connectDb();

    // Map matched IDs to MongoDB product variants
    const matchedItems: any[] = [];
    for (const match of matches) {
      const variant = await GroceryVariant.findById(match.variantId)
        .populate({
          path: "grocery",
          model: Grocery,
          populate: {
            path: "category",
            select: "name"
          }
        });

      if (variant) {
        matchedItems.push({
          name: (variant.grocery as any)?.name || variant.label,
          matchedLabel: variant.label,
          variantId: variant._id.toString(),
          category: (variant.grocery as any)?.category?.name || "Groceries",
          price: variant.price?.selling || 0,
          image: (variant.grocery as any)?.images?.[0]?.url || null,
          score: match.score
        });
      }
    }

    return NextResponse.json({
      success: true,
      matchedItems
    });
  } catch (error: any) {
    console.error("Vision search Next.js API error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to query vision search" }, { status: 500 });
  }
}
