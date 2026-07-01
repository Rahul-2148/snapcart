import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const mode = formData.get("mode") || "receipt";

    if (!file) {
      return NextResponse.json({ success: false, message: "No image file provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, message: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    const promptText = mode === "receipt" 
      ? "Analyze this grocery receipt image. Extract all item names and their purchased quantities. Respond ONLY with a valid JSON block containing an array of items: { \"extracted\": [ { \"name\": \"item name\", \"quantity\": 1 } ] }. Do not include markdown code ticks outside the JSON."
      : mode === "lens"
      ? "Identify ALL grocery/food products visible in this image. For each item, provide the product name, likely grocery category (e.g. Fruits, Dairy, Snacks, Beverages, Vegetables, Grains), and a brief 5-word description. Respond ONLY with a valid JSON block: { \"extracted\": [ { \"name\": \"product name\", \"category\": \"category\", \"description\": \"brief description\", \"quantity\": 1 } ] }. Do not include markdown code ticks."
      : "Identify the primary grocery item visible in this image. Respond ONLY with a valid JSON block: { \"extracted\": [ { \"name\": \"item name\", \"quantity\": 1 } ] }.";

    const modelCandidates = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let response: Response | null = null;
    let lastError: Error | null = null;

    for (const model of modelCandidates) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: promptText },
                    {
                      inlineData: {
                        mimeType: file.type || "image/jpeg",
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
            }),
          }
        );
        if (response.ok) {
          break;
        } else {
          const errText = await response.text();
          console.warn(`Vision call failed for model ${model}: status ${response.status}. Response: ${errText}`);
          lastError = new Error(`Vision call failed for model ${model}: status ${response.status}`);
        }
      } catch (err: any) {
        console.warn(`Vision call failed for model ${model}: ${err.message}`);
        lastError = err;
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error("Gemini multimodal vision call failed for all models");
    }

    const json = await response.json();
    let replyText = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    // Clean JSON markdown ticks if present
    replyText = replyText.replace(/```json|```/g, "").trim();

    const parsedData = JSON.parse(replyText);
    const extractedList: Array<{ name: string; quantity: number }> = parsedData.extracted || [];

    await connectDb();
    const matchedItems: any[] = [];

    const session = await auth();
    const userId = session?.user?.id || "000000000000000000000000";

    // Intelligent fuzzy product matching function
    const findBestVariant = async (itemName: string) => {
      const cleanName = itemName.replace(/[^\w\s-]/g, "").trim();
      if (!cleanName) return null;

      // 1. Direct exact match (case-insensitive) on label
      let variant = await GroceryVariant.findOne({
        label: { $regex: `^${cleanName}$`, $options: "i" }
      });
      if (variant) return variant;

      // 2. Substring match on label
      variant = await GroceryVariant.findOne({
        label: { $regex: cleanName, $options: "i" }
      });
      if (variant) return variant;

      // 3. Words match: split name and check if label has all words (length >= 3)
      const words = cleanName.split(/\s+/).filter(w => w.length >= 3);
      if (words.length > 0) {
        const andQuery = words.map(w => ({ label: { $regex: w, $options: "i" } }));
        variant = await GroceryVariant.findOne({ $and: andQuery });
        if (variant) return variant;

        // 4. Try matching the longest word
        const sortedWords = [...words].sort((a, b) => b.length - a.length);
        const longestWord = sortedWords[0];
        if (longestWord) {
          variant = await GroceryVariant.findOne({
            label: { $regex: longestWord, $options: "i" }
          });
          if (variant) return variant;
        }
      }

      // 5. Fallback to first word
      const firstWord = cleanName.split(/\s+/)[0];
      if (firstWord) {
        variant = await GroceryVariant.findOne({
          label: { $regex: firstWord, $options: "i" }
        });
        if (variant) return variant;
      }

      return null;
    };

    if (mode === "lens") {
      // Lens mode: search only, don't add to cart
      for (const item of extractedList) {
        const variant = await findBestVariant(item.name);
        if (variant) {
          // Populate grocery to get images and product ID, and nested category to get category ID/name
          const populatedVariant = await variant.populate({
            path: "grocery",
            populate: { path: "category" }
          });
          const grocery = populatedVariant.grocery as any;
          const categoryObj = grocery?.category as any;

          matchedItems.push({
            name: item.name,
            matchedLabel: variant.label,
            variantId: variant._id.toString(),
            productId: grocery?._id?.toString() || "",
            categoryId: categoryObj?._id?.toString() || "",
            categoryName: categoryObj?.name || (item as any).category || "Grocery",
            image: grocery?.images?.[0]?.url || "",
            price: variant.price.selling || 0,
          });
        }
      }
    } else {
      // Receipt/default mode: match and add to cart
      let cart = await Cart.findOne({ user: userId, isActive: true });
      if (!cart) {
        cart = await Cart.create({ user: userId, isActive: true });
      }

      for (const item of extractedList) {
        const variant = await findBestVariant(item.name);
        if (variant) {
          await CartItem.findOneAndUpdate(
            { cart: cart._id, variant: variant._id },
            {
              $set: {
                quantity: item.quantity || 1,
                priceAtAdd: {
                  mrp: variant.price.mrp,
                  selling: variant.price.selling,
                },
              },
            },
            { upsert: true }
          );
          matchedItems.push({
            name: item.name,
            matchedLabel: variant.label,
            variantId: variant._id.toString(),
            quantity: item.quantity,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      extractedItems: extractedList,
      matchedItems,
      addedToCart: mode !== "lens" && matchedItems.length > 0,
    });
  } catch (error: any) {
    console.error("AI vision API gateway error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to process visual query" }, { status: 500 });
  }
}
