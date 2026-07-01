import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { Grocery } from "@/models/grocery.model";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await connectDb();
    
    // Fetch all variants with parent groceries
    const variants = await GroceryVariant.find({})
      .populate({
        path: "grocery",
        model: Grocery
      });

    const indexItems = variants
      .map((v) => {
        const parent = v.grocery as any;
        const imageUrl = parent?.images?.[0]?.url;
        if (!imageUrl) return null;
        return {
          id: v._id.toString(),
          image_url: imageUrl
        };
      })
      .filter(Boolean);

    // Call FastAPI index rebuild
    const fastapiRes = await fetch("http://127.0.0.1:8000/vision/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variants: indexItems })
    });

    if (!fastapiRes.ok) {
      const errText = await fastapiRes.text();
      return NextResponse.json({ success: false, message: `FastAPI responded with error: ${errText}` }, { status: 500 });
    }

    const data = await fastapiRes.json();
    return NextResponse.json({
      success: true,
      message: "Index rebuild triggered successfully",
      indexedCount: data.indexed_count,
      failedCount: data.failed_count,
      errors: data.errors
    });
  } catch (error: any) {
    console.error("Vision index Next.js API error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to trigger vision index rebuild" }, { status: 500 });
  }
}
