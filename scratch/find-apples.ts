import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "../src/lib/server/db";
import { Grocery } from "../src/models/grocery.model";
import { GroceryVariant } from "../src/models/groceryVariant.model";

async function run() {
  await connectDb();
  console.log("Connected to DB.");

  const groceries = await Grocery.find({
    name: { $regex: /apple/i }
  }).lean();

  console.log("Matching Groceries:", groceries.map(g => ({ id: g._id, name: g.name })));

  for (const g of groceries) {
    const variants = await GroceryVariant.find({ grocery: g._id }).lean();
    console.log(`Variants for ${g.name}:`, variants.map(v => ({ id: v._id, label: v.label, price: v.price })));
  }

  await mongoose.disconnect();
}

run();
