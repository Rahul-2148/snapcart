// src/app/api/admin/seed-categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Category } from "@/models/category.model";
import { createSlug } from "@/lib/utils/createSlug";

// Use only units that are in your enum from category.model.ts
const ALLOWED_UNITS = [
  "kg",
  "g",
  "liter",
  "ml",
  "piece",
  "dozen",
  "pack",
  "packet",
  "pouch",
  "box",
  "bag",
  "tray",
  "bottle",
  "jar",
  "can",
  "tin",
  "bar",
  "loaf",
  "slice",
  "roll",
  "cup",
  "cone",
  "sachet",
  "strip",
  "tub",
  "sheet",
];

const categories = [
  {
    name: "Fruits & Vegetables",
    allowedUnits: ["kg", "g", "piece", "pack", "packet", "tray", "box"],
  },
  {
    name: "Dairy & Eggs",
    allowedUnits: ["liter", "ml", "piece", "dozen", "pack", "pouch", "box"],
  },
  {
    name: "Rice, Atta & Grains",
    allowedUnits: ["kg", "g", "pack", "packet", "pouch", "bag"],
  },
  {
    name: "Oil & Ghee",
    allowedUnits: ["liter", "ml", "bottle", "jar", "can", "tin", "pouch"],
  },
  {
    name: "Snacks & Biscuits",
    allowedUnits: ["g", "pack", "packet", "box", "pouch", "tin"],
  },
  {
    name: "Beverages & Drinks",
    allowedUnits: ["liter", "ml", "bottle", "can", "pack", "box"],
  },
  {
    name: "Breakfast & Cereals",
    allowedUnits: ["g", "kg", "pack", "box", "pouch"],
  },
  {
    name: "Spices & Condiments",
    allowedUnits: ["g", "kg", "pack", "packet", "jar", "pouch"],
  },
  {
    name: "Dry Fruits & Nuts",
    allowedUnits: ["g", "kg", "pack", "packet", "box", "pouch"],
  },
  {
    name: "Instant & Packaged Foods",
    allowedUnits: ["g", "pack", "packet", "box", "pouch", "cup", "sachet"],
  },
  {
    name: "Bakery & Breads",
    allowedUnits: ["piece", "pack", "packet", "loaf", "slice", "roll"],
  },
  {
    name: "Sweets & Chocolates",
    allowedUnits: ["g", "piece", "pack", "box", "bar", "packet"],
  },
  {
    name: "Frozen Foods",
    allowedUnits: ["g", "kg", "pack", "packet", "box", "tray"],
  },
  {
    name: "Meat & Seafood",
    allowedUnits: ["kg", "g", "piece", "pack", "tray"],
  },
  {
    name: "Baby & Pet Care",
    allowedUnits: ["g", "ml", "piece", "pack", "bottle", "pouch", "sachet"],
  },
  {
    name: "Personal Care",
    allowedUnits: ["ml", "piece", "pack", "bottle", "jar", "sachet", "tub"], // Changed "tube" to "tub"
  },
  {
    name: "Cleaning & Laundry",
    allowedUnits: ["ml", "liter", "piece", "pack", "bottle", "sachet", "pouch"],
  },
  {
    name: "Household Essentials",
    allowedUnits: ["piece", "pack", "roll", "sheet", "box", "packet"],
  },
  {
    name: "Pooja Needs",
    allowedUnits: ["g", "piece", "pack", "packet", "box"],
  },
  {
    name: "Pharmacy & Health",
    allowedUnits: ["piece", "strip", "bottle", "pack", "sachet"], // Removed "tube"
  },
  {
    name: "Stationery & Office",
    allowedUnits: ["piece", "pack", "box", "dozen"], // Removed "set"
  },
  {
    name: "Others",
    allowedUnits: ["piece", "pack", "packet", "box"], // Removed "set"
  },
];

export async function GET(req: NextRequest) {
  try {
    await connectDb();

    // Check if user is admin (optional - you can comment this out for now)
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("🗑️ Checking existing categories...");

    // First, check if categories already exist
    const existingCount = await Category.countDocuments();

    if (existingCount > 0) {
      console.log(`📊 Found ${existingCount} existing categories`);

      // Option 1: Delete and recreate
      console.log("🗑️ Deleting existing categories...");
      await Category.deleteMany({});

      // Option 2: Or update existing ones (safer)
      // await Category.updateMany(
      //   {},
      //   { $set: { isActive: true } }
      // );
    }

    console.log("🌱 Seeding categories...");
    const insertedCategories = [];

    // Insert new categories
    for (const category of categories) {
      try {
        // Filter allowedUnits to only include valid ones
        const validAllowedUnits = category.allowedUnits.filter((unit) =>
          ALLOWED_UNITS.includes(unit)
        );

        // If no valid units, use a default
        if (validAllowedUnits.length === 0) {
          validAllowedUnits.push("piece");
        }

        const newCategory = await Category.create({
          ...category,
          allowedUnits: validAllowedUnits,
          slug: createSlug(category.name),
          isActive: true,
        });

        insertedCategories.push(newCategory.name);
        console.log(`   ✅ Added: ${category.name}`);
      } catch (error: any) {
        if (error.code === 11000) {
          // Duplicate key - skip this category
          console.log(`   ⚠️ Skipping (duplicate): ${category.name}`);
        } else {
          console.error(`   ❌ Error adding ${category.name}:`, error.message);
        }
      }
    }

    const finalCount = await Category.countDocuments();

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${insertedCategories.length} categories`,
      inserted: insertedCategories,
      count: finalCount,
      details: {
        attempted: categories.length,
        successful: insertedCategories.length,
        duplicates: categories.length - insertedCategories.length,
      },
    });
  } catch (error) {
    console.error("SEED CATEGORIES ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to seed categories",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
