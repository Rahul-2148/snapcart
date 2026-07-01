import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "../src/lib/server/db";
import { Grocery } from "../src/models/grocery.model";
import { Category } from "../src/models/category.model";

async function run() {
  try {
    await connectDb();
    console.log("Connected to DB.");

    const allGroceries = await Grocery.find().populate("category").lean();
    console.log("Total products in database:", allGroceries.length);

    allGroceries.forEach((g: any) => {
      console.log(`- Name: ${g.name}`);
      console.log(`  Description: ${g.description}`);
      console.log(`  Category Name: ${g.category?.name}`);
      console.log(`  Category ID: ${g.category?._id}`);
      console.log(`  Brand: ${g.brand}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
