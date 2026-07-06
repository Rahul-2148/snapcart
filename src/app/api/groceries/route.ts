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
    const category = searchParams.get("category") || "";
    const ids = searchParams.get("ids") || "";
    const getBrands = searchParams.get("getBrands") === "true";

    const query: any = { isActive: true };
    
    if (ids) {
      const mongoose = (await import("mongoose")).default;
      const idArray = ids.split(",")
        .map((id) => id.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      query._id = { $in: idArray };
    }

    if (search && search.trim()) {
      const { generateGeminiEmbedding, SYNONYMS, STOP_WORDS } = await import("@/lib/server/ai/rag");
      
      const cleanString = search.trim().toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "");
      const keywords = cleanString
        .split(/\s+/)
        .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

      const searchTermsSet = new Set<string>();
      searchTermsSet.add(search.trim());

      for (const word of keywords) {
        searchTermsSet.add(word);
        const synonyms = SYNONYMS[word];
        if (synonyms) {
          synonyms.forEach((syn) => searchTermsSet.add(syn));
        }
      }

      const escapedTerms = Array.from(searchTermsSet).map((term) =>
        term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      );
      const searchPattern = escapedTerms.join("|");
      const synonymRegex = new RegExp(searchPattern, "i");

      const embedding = await generateGeminiEmbedding(search.trim());
      if (embedding) {
        try {
          const vectorResults = await Grocery.aggregate([
            {
              $vectorSearch: {
                index: "default",
                path: "vectorEmbedding",
                queryVector: embedding,
                numCandidates: 100,
                limit: 50,
              },
            },
            {
              $project: {
                _id: 1,
              },
            },
          ]);

          if (vectorResults.length > 0) {
            const candidateIds = vectorResults.map((doc: any) => doc._id);
            query._id = { $in: candidateIds };
          } else {
            query.$or = [
              { name: { $regex: synonymRegex } },
              { description: { $regex: synonymRegex } },
              { brand: { $regex: synonymRegex } },
            ];
          }
        } catch (vectorError) {
          console.warn("MongoDB Vector Search failed in products list API, using fallback:", vectorError);
          query.$or = [
            { name: { $regex: synonymRegex } },
            { description: { $regex: synonymRegex } },
            { brand: { $regex: synonymRegex } },
          ];
        }
      } else {
        query.$or = [
          { name: { $regex: synonymRegex } },
          { description: { $regex: synonymRegex } },
          { brand: { $regex: synonymRegex } },
        ];
      }
    }
    if (category) {
      // Normalize slug: lowercase, replace spaces/underscores with dashes
      let categoryId: any = category;
      const mongoose = (await import("mongoose")).default;
      let found = null;
      if (!mongoose.Types.ObjectId.isValid(category)) {
        const normalizedSlug = category
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/_+/g, "-");
        const { Category } = await import("@/models/category.model");
        found = await Category.findOne({ slug: normalizedSlug });
        if (found) {
          categoryId = found._id;
        } else {
          // No such category, return empty groceries array
          return NextResponse.json({ success: true, groceries: [] });
        }
      } else {
        categoryId = new mongoose.Types.ObjectId(category);
      }
      if (categoryId) {
        query.category = categoryId;
      }
    }

    // If getting brands for a category
    if (getBrands && category) {
      const brands = await Grocery.distinct("brand", {
        category,
        isActive: true,
      });
      return NextResponse.json({
        success: true,
        brands: brands.filter(Boolean).sort(),
      });
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = searchParams.get("limit");

    let dbQuery = Grocery.find(query)
      .populate("category", "name allowedUnits")
      .populate({
        path: "variants",
        model: "GroceryVariant",
        select: "label variantName unit price countInStock isDefault cod",
      })
      .sort({ createdAt: -1 })
      .lean();

    if (limit && limit !== "all") {
      const limitVal = parseInt(limit);
      const skip = (page - 1) * limitVal;
      dbQuery = dbQuery.skip(skip).limit(limitVal);
    } else if (!limit) {
      // Default limit of 48 items to prevent heavy fetches, but keep configurable
      dbQuery = dbQuery.limit(48);
    }

    const groceries = await dbQuery;

    return NextResponse.json({
      success: true,
      groceries: groceries || [],
    });
  } catch (error: any) {
    console.error("GET GROCERIES ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to fetch groceries: ${error.message}`,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
