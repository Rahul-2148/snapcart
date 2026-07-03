// src/app/api/groceries/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDb from "@/lib/server/db";
import { Grocery } from "@/models/grocery.model";
import { generateGeminiEmbedding, SYNONYMS, STOP_WORDS } from "@/lib/server/ai/rag";

// 🔥 register related models
import "@/models/category.model";
import "@/models/groceryVariant.model";

export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const brand = searchParams.get("brand") || "";
    const sort = searchParams.get("sort") || "newest";
    const limit = parseInt(searchParams.get("limit") || "50");
    const getBrands = searchParams.get("getBrands") === "true";

    // Build query object
    const query: any = { isActive: true };

    // Text search (optional) - allow category/brand filters without search
    if (search && search.trim()) {
      // Build synonym-expanded regex pattern
      const cleanString = search.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
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
                limit: limit,
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
            // fallback if vector returns zero items
            query.$or = [
              { name: { $regex: synonymRegex } },
              { description: { $regex: synonymRegex } },
              { brand: { $regex: synonymRegex } },
            ];
          }
        } catch (vectorError) {
          console.warn("MongoDB Vector Search failed in search API, using fallback:", vectorError);
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
    } else if (!category && !brand) {
      // If no search or filters, return empty to avoid heavy query
      return NextResponse.json({
        success: true,
        groceries: [],
        total: 0,
      });
    }

    // Category filter
    if (category && category.trim()) {
      query.category = category;
    }

    // Brand filter
    if (brand && brand.trim()) {
      query.brand = brand;
    }

    // If only getting brands, return distinct brands for a category
    if (getBrands && category) {
      const brands = await Grocery.distinct("brand", { 
        category, 
        isActive: true 
      });
      return NextResponse.json({
        success: true,
        brands: brands.filter(Boolean).sort(),
      });
    }

    // Sort options
    let sortObj: any = { createdAt: -1 };
    switch (sort) {
      case "name-asc":
        sortObj = { name: 1 };
        break;
      case "name-desc":
        sortObj = { name: -1 };
        break;
      case "newest":
        sortObj = { createdAt: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    // Fetch groceries with population - DO NOT use .lean() to preserve ObjectId type
    const groceries = await Grocery.find(query)
      .populate("category", "name allowedUnits")
      .populate({
        path: "variants",
        model: "GroceryVariant",
      })
      .sort(sortObj)
      .limit(limit);

    // Ensure _id is included and properly formatted - convert Mongoose docs to plain objects
    const formattedGroceries = groceries.map((doc: any, index: number) => {
      const grocery = doc.toObject ? doc.toObject() : doc;
      
      // Get the ID in the most reliable way possible
      const mongoId = grocery._id;
      const idString = mongoId?.toString ? mongoId.toString() : String(mongoId);
      
      console.log(
        `[Search Result #${index + 1}] Name: "${grocery.name}", ` +
        `ID Type: ${typeof mongoId}, ` +
        `ID Value: "${idString}", ` +
        `ID Valid: ${mongoose.Types.ObjectId.isValid(idString)}`
      );
      
      return {
        _id: idString,  // String version for API response
        name: grocery.name,
        description: grocery.description,
        brand: grocery.brand,
        images: grocery.images,
        badges: grocery.badges,
        isActive: grocery.isActive,
        category: grocery.category,
      };
    });

    console.log(`[Search] Returning ${formattedGroceries.length} results`);
    
    return NextResponse.json({
      success: true,
      groceries: formattedGroceries || [],
      total: formattedGroceries.length,
    });
  } catch (error) {
    console.error("SEARCH GROCERIES ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to search groceries",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
