// src/app/api/admin/stores/[id]/inventory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";
import { StoreInventory } from "@/models/storeInventory.model";
import { Grocery } from "@/models/grocery.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { Category } from "@/models/category.model";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const { id: storeId } = await params;

    // Check store exists
    const store = await Store.findById(storeId);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Fetch active categories, groceries, and variants
    const categories = await Category.find({}).lean();
    const groceries = await Grocery.find({}).lean();
    const variants = await GroceryVariant.find({}).lean();

    // Fetch existing overrides for this store
    const storeInventories = await StoreInventory.find({ store: storeId }).lean();
    const storeInventoryMap = new Map(
      storeInventories.map((item) => [item.variant.toString(), item])
    );

    // Build the mapped inventory items response
    const inventory = variants.map((variant) => {
      const grocery = groceries.find((g) => g._id.toString() === variant.grocery.toString());
      const category = grocery
        ? categories.find((c) => c._id.toString() === grocery.category?.toString())
        : null;

      const override = storeInventoryMap.get(variant._id.toString());

      return {
        variantId: variant._id.toString(),
        groceryId: variant.grocery.toString(),
        name: grocery?.name || "Unknown Product",
        image: grocery?.image?.url || grocery?.images?.[0]?.url || "",
        variantLabel: variant.label,
        categoryName: category?.name || "Uncategorized",
        defaultMrp: variant.price?.mrp || 0,
        defaultSelling: variant.price?.selling || 0,
        storeStock: override ? override.stock : 0,
        storeMrp: override?.priceOverride?.mrp ?? null,
        storeSelling: override?.priceOverride?.selling ?? null,
        isAvailable: override ? override.isAvailable : true,
      };
    });

    return NextResponse.json({ storeName: store.name, inventory });
  } catch (error: any) {
    console.error("GET Admin Store Inventory Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const { id: storeId } = await params;

    const { updates } = await req.json(); // Array of { variantId, groceryId, stock, mrp, selling, isAvailable }
    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Updates list must be an array" }, { status: 400 });
    }

    // Process overrides sequentially or in bulk operations
    const bulkOps = updates.map((update) => {
      const hasOverride = update.mrp !== null && update.selling !== null;
      const priceOverride = hasOverride
        ? { mrp: Number(update.mrp), selling: Number(update.selling) }
        : undefined;

      const updateFields: any = {
        store: storeId,
        grocery: update.groceryId,
        variant: update.variantId,
        stock: Number(update.stock),
        isAvailable: Boolean(update.isAvailable),
      };

      if (priceOverride) {
        updateFields.priceOverride = priceOverride;
      } else {
        updateFields.$unset = { priceOverride: "" };
      }

      return {
        updateOne: {
          filter: { store: storeId, variant: update.variantId },
          update: priceOverride
            ? { $set: updateFields }
            : { $set: { ...updateFields, priceOverride: undefined }, $unset: { priceOverride: "" } },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
      await StoreInventory.bulkWrite(bulkOps);
    }

    return NextResponse.json({ success: true, message: "Inventory updated successfully" });
  } catch (error: any) {
    console.error("POST Admin Store Inventory Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
