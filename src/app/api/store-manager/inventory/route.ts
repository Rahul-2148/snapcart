// src/app/api/store-manager/inventory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";
import { StoreInventory } from "@/models/storeInventory.model";
import { Grocery } from "@/models/grocery.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { Category } from "@/models/category.model";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const isManager = session?.user?.roles?.includes("storeManager");
    const isAdmin = session?.user?.roles?.includes("admin");

    if (!session || (!isManager && !isAdmin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    // Find store managed by this user
    const query = isAdmin ? {} : { manager: session.user.id };
    const store = await Store.findOne(query);

    if (!store) {
      return NextResponse.json(
        { error: "No store assigned to this manager account" },
        { status: 404 }
      );
    }

    const categories = await Category.find({}).lean();
    const groceries = await Grocery.find({}).lean();
    const variants = await GroceryVariant.find({}).lean();

    const storeInventories = await StoreInventory.find({ store: store._id }).lean();
    const storeInventoryMap = new Map(
      storeInventories.map((item) => [item.variant.toString(), item])
    );

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

    return NextResponse.json({ inventory });
  } catch (error: any) {
    console.error("GET Store Manager Inventory Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const isManager = session?.user?.roles?.includes("storeManager");
    const isAdmin = session?.user?.roles?.includes("admin");

    if (!session || (!isManager && !isAdmin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const query = isAdmin ? {} : { manager: session.user.id };
    const store = await Store.findOne(query);

    if (!store) {
      return NextResponse.json(
        { error: "No store assigned to this manager account" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { variantId, groceryId, stock, isAvailable, priceOverride } = body;

    if (!variantId || !groceryId) {
      return NextResponse.json(
        { error: "VariantId and groceryId are required" },
        { status: 400 }
      );
    }

    // Update or insert override
    const override = await StoreInventory.findOne({
      store: store._id,
      variant: variantId,
    });

    if (override) {
      if (stock !== undefined) override.stock = Number(stock);
      if (isAvailable !== undefined) override.isAvailable = Boolean(isAvailable);
      if (priceOverride !== undefined) {
        override.priceOverride = priceOverride;
      }
      await override.save();
    } else {
      const newOverride = new StoreInventory({
        store: store._id,
        grocery: groceryId,
        variant: variantId,
        stock: stock !== undefined ? Number(stock) : 0,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        priceOverride: priceOverride !== undefined ? priceOverride : undefined,
      });
      await newOverride.save();
    }

    return NextResponse.json({ success: true, message: "Inventory updated successfully" });
  } catch (error: any) {
    console.error("PUT Store Manager Inventory Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
