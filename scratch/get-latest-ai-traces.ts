import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "../src/lib/server/db";
import { AiTrace } from "../src/models/aiTrace.model";
import mongoose from "mongoose";

async function run() {
  try {
    await connectDb();
    console.log("Connected to MongoDB.");
    
    const latestTraces = await AiTrace.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
      
    console.log(`Found ${latestTraces.length} recent traces.`);
    latestTraces.forEach((trace, idx) => {
      console.log(`\n--- Trace #${idx + 1} ---`);
      console.log(`Timestamp: ${trace.createdAt}`);
      console.log(`Model: ${trace.model}`);
      console.log(`Status: ${trace.status}`);
      console.log(`Latency: ${trace.latencyMs}ms`);
      if (trace.error) {
        console.log(`Error: ${trace.error}`);
      }
    });
  } catch (err) {
    console.error("Error fetching traces:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
