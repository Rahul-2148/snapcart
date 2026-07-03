import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { Grocery } from "@/models/grocery.model";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds timeout for Vercel Serverless Function to allow Render cold start

let isIndexVerified = false;

async function ensureVisionIndex(ML_ENGINE_URL: string) {
  if (isIndexVerified) return;
  try {
    const healthRes = await fetch(`${ML_ENGINE_URL}/vision/health`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
    if (healthRes && healthRes.ok) {
      const healthData = await healthRes.json();
      if (healthData.status === "healthy" && healthData.index_size > 0) {
        isIndexVerified = true;
        return; // Index is already populated and healthy
      }
    }

    console.log("[Vision Search] FAISS index is empty or cold started. Rebuilding index on the fly...");
    const variants = await GroceryVariant.find({}).populate({
      path: "grocery",
      model: Grocery
    });

    const indexItems = variants
      .map((v) => {
        const parent = v.grocery as any;
        const imageUrl = parent?.images?.[0]?.url;
        if (!imageUrl) return null;

        let absoluteImageUrl = imageUrl;
        if (imageUrl.startsWith("/")) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          absoluteImageUrl = `${appUrl.replace(/\/$/, "")}${imageUrl}`;
        }

        return {
          id: v._id.toString(),
          image_url: absoluteImageUrl
        };
      })
      .filter(Boolean);

    if (indexItems.length > 0) {
      const indexRes = await fetch(`${ML_ENGINE_URL}/vision/index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variants: indexItems }),
        signal: AbortSignal.timeout(20000)
      });
      if (indexRes.ok) {
        const result = await indexRes.json();
        isIndexVerified = true;
        console.log(`[Vision Search] Successfully rebuilt FAISS index with ${result.indexedCount} variants.`);
      } else {
        console.error("[Vision Search] Failed to rebuild index via FastAPI:", await indexRes.text());
      }
    }
  } catch (err) {
    console.error("[Vision Search] Auto-index rebuild failed:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const k = formData.get("k") || "5";

    if (!file) {
      return NextResponse.json({ success: false, message: "No image file provided" }, { status: 400 });
    }

    await connectDb();

    const ML_ENGINE_URL = (process.env.ML_ENGINE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
    
    // Self-healing: Check and ensure index is not empty before searching
    await ensureVisionIndex(ML_ENGINE_URL);

    // Forward the file upload to FastAPI
    const fastapiFormData = new FormData();
    fastapiFormData.append("file", file);
    fastapiFormData.append("k", k);

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

    // Map matched IDs to MongoDB product variants
    const matchedItems: any[] = [];
    for (const match of matches) {
      if (match.score < 0.38) {
        console.log(`[Vision Search] Skipping match ${match.variantId} due to low similarity score: ${match.score}`);
        continue;
      }
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
        const parent = variant.grocery as any;
        const imageUrl = parent?.images?.[0]?.url || null;
        let absoluteImageUrl = imageUrl;
        if (imageUrl && imageUrl.startsWith("/")) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          absoluteImageUrl = `${appUrl.replace(/\/$/, "")}${imageUrl}`;
        }

        matchedItems.push({
          name: parent?.name || variant.label,
          matchedLabel: variant.label,
          variantId: variant._id.toString(),
          productId: parent?._id?.toString() || "",
          categoryId: parent?.category?._id?.toString() || parent?.category || "",
          categoryName: parent?.category?.name || "Groceries",
          category: parent?.category?.name || "Groceries",
          price: variant.price?.selling || 0,
          image: absoluteImageUrl,
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
