import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "../src/lib/server/db";
import { searchGroceries } from "../src/lib/server/ai/rag";

async function run() {
  try {
    await connectDb();
    console.log("Connected to DB.");

    const query = "i want sex products";
    console.log(`Searching for query: "${query}"`);
    const results = await searchGroceries(query, 5);
    
    console.log(`Found ${results.length} results:`);
    results.forEach((r: any) => {
      console.log(`- Name: ${r.name}`);
      console.log(`  Brand: ${r.brand}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    await mongoose.disconnect();
  }
}

run();
