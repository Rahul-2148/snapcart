// src/app/api/products/by-store/[storeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";
import { StoreInventory } from "@/models/storeInventory.model";
import { Grocery } from "@/models/grocery.model";
import "@/models/category.model";
import "@/models/groceryVariant.model";

/**
 * GET /api/products/by-store/:storeId?category=X&search=Y
 *
 * Returns products available at a specific store.
 * Falls back to global products if store has no inventory records.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    await connectDb();

    const { storeId } = await params;
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";

    // Validate store exists
    const store = await Store.findById(storeId);
    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 },
      );
    }

    // Check if store has any inventory records
    const inventoryCount = await StoreInventory.countDocuments({
      store: storeId,
      isAvailable: true,
    });

    // If no inventory records, fall back to global products
    if (inventoryCount === 0) {
      const query: any = { isActive: true };
      if (search) query.name = { $regex: search, $options: "i" };
      if (category) {
        const mongoose = (await import("mongoose")).default;
        if (mongoose.Types.ObjectId.isValid(category)) {
          query.category = new mongoose.Types.ObjectId(category);
        }
      }

      const groceries = await Grocery.find(query)
        .populate("category", "name allowedUnits slug")
        .populate({
          path: "variants",
          model: "GroceryVariant",
          select: "label variantName unit price countInStock isDefault cod",
        })
        .sort({ createdAt: -1 });

      // Get unique categories from results
      const categorySet = new Map<string, any>();
      groceries.forEach((g: any) => {
        if (g.category && !categorySet.has(g.category._id.toString())) {
          categorySet.set(g.category._id.toString(), {
            _id: g.category._id,
            name: g.category.name,
            slug: g.category.slug,
            productCount: 0,
          });
        }
        if (g.category) {
          const cat = categorySet.get(g.category._id.toString());
          if (cat) cat.productCount++;
        }
      });

      return NextResponse.json({
        success: true,
        groceries,
        categories: Array.from(categorySet.values()),
        usingFallback: true,
        storeName: store.name,
      });
    }

    // ── Fetch store-specific inventory ──────────────────────────────
    const inventoryQuery: any = { store: storeId, isAvailable: true, stock: { $gt: 0 } };

    // Get inventory items
    const inventoryItems = await StoreInventory.find(inventoryQuery)
      .populate({
        path: "grocery",
        match: { isActive: true, ...(search ? { name: { $regex: search, $options: "i" } } : {}) },
        populate: [
          { path: "category", select: "name allowedUnits slug" },
        ],
      })
      .populate({
        path: "variant",
        select: "label variantName unit price countInStock isDefault cod",
      })
      .lean();

    // Group by grocery and attach variants
    const groceryMap = new Map<string, any>();
    const categorySet = new Map<string, any>();

    inventoryItems.forEach((item: any) => {
      if (!item.grocery) return; // skip if grocery was filtered out

      const groceryId = item.grocery._id.toString();

      // Apply category filter if specified
      if (category && item.grocery.category?._id?.toString() !== category) {
        return;
      }

      if (!groceryMap.has(groceryId)) {
        groceryMap.set(groceryId, {
          ...item.grocery,
          variants: [],
        });

        // Track categories
        if (item.grocery.category) {
          const catId = item.grocery.category._id.toString();
          if (!categorySet.has(catId)) {
            categorySet.set(catId, {
              _id: item.grocery.category._id,
              name: item.grocery.category.name,
              slug: item.grocery.category.slug,
              productCount: 0,
            });
          }
          const cat = categorySet.get(catId);
          if (cat) cat.productCount++;
        }
      }

      // Add variant with stock from inventory
      if (item.variant) {
        const variant = { ...item.variant };
        // Apply price override if exists
        if (item.priceOverride?.mrp && item.priceOverride?.selling) {
          variant.price = {
            mrp: item.priceOverride.mrp,
            selling: item.priceOverride.selling,
            discountPercent: Math.round(
              ((item.priceOverride.mrp - item.priceOverride.selling) /
                item.priceOverride.mrp) *
                100,
            ),
          };
        }
        variant.countInStock = item.stock;
        groceryMap.get(groceryId).variants.push(variant);
      }
    });

    const groceries = Array.from(groceryMap.values());

    return NextResponse.json({
      success: true,
      groceries,
      categories: Array.from(categorySet.values()),
      usingFallback: false,
      storeName: store.name,
      totalProducts: groceries.length,
    });
  } catch (error: any) {
    console.error("GET /api/products/by-store ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch store products" },
      { status: 500 },
    );
  }
}
