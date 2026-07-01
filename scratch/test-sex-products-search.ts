import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "../src/lib/server/db";
import { searchGroceries } from "../src/lib/server/ai/rag";

async function run() {
  try {
    console.log("Connecting to DB...");
    await connectDb();
    console.log("Connected.");

    const query = "i want fruits";
    console.log(`Searching for query: "${query}"`);
    const results = await searchGroceries(query, 5);
    
    console.log(`\nFound ${results.length} results:`);
    results.forEach((r: any) => {
      console.log(`- Name: ${r.name}`);
      console.log(`  Brand: ${r.brand}`);
      console.log(`  Description: ${r.description}`);
      console.log(`  Variants: ${r.variants?.map((v: any) => `${v.label} (₹${v.price.selling})`).join(", ")}`);
    });

    await mongoose.disconnect();
    console.log("\nDisconnected.");
  } catch (error) {
    console.error("Failed:", error);
    await mongoose.disconnect();
  }
}

run();
