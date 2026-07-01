import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "../src/lib/server/db";
import { Grocery } from "../src/models/grocery.model";
import { Category } from "../src/models/category.model";

async function run() {
  await connectDb();
  console.log("Connected to DB.");

  const allGroceries = await Grocery.find().populate("category").lean();
  console.log("Total products in database:", allGroceries.length);

  const matched = allGroceries.filter(g => 
    /condom|manforce|sex|wellness/i.test(g.name) || 
    /condom|manforce|sex|wellness/i.test(g.description || "")
  );

  console.log("Matched products:");
  matched.forEach(g => {
    console.log(`- ID: ${g._id}`);
    console.log(`  Name: ${g.name}`);
    console.log(`  Description: ${g.description}`);
    console.log(`  Category: ${g.category?.name} (${g.category?._id})`);
    console.log(`  Brand: ${g.brand}`);
  });

  await mongoose.disconnect();
}

run();
