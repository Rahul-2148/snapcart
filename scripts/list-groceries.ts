// scripts/list-groceries.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { Grocery } from "../src/models/grocery.model";
import { Category } from "../src/models/category.model";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const categories = await Category.find({}).lean();
  console.log("=== CATEGORIES ===");
  categories.forEach((c: any) => console.log(`- ${c.name} (ID: ${c._id})`));

  const groceries = await Grocery.find({}).populate("variants").limit(30).lean();
  console.log("\n=== GROCERIES ===");
  groceries.forEach((g: any) => {
    console.log(`- ${g.name} (Brand: ${g.brand}, Category ID: ${g.category})`);
    if (g.variants) {
      g.variants.forEach((v: any) => {
        console.log(`   * Variant: ${v.label} (Price: ${v.price?.selling}, Stock: ${v.countInStock})`);
      });
    }
  });

  await mongoose.connection.close();
}

main();
