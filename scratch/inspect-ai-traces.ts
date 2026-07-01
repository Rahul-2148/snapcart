import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "../src/lib/server/db";
import { AiTrace } from "../src/models/aiTrace.model";

async function run() {
  try {
    await connectDb();
    console.log("Connected to DB.");

    const traces = await AiTrace.find().sort({ createdAt: -1 }).limit(10).lean();
    console.log(`Found ${traces.length} recent traces:`);
    
    for (const trace of traces) {
      console.log(`\n==================================================`);
      console.log(`Trace ID: ${trace._id}`);
      console.log(`Task Type: ${trace.taskType}`);
      console.log(`Model: ${trace.model}`);
      console.log(`Latency: ${trace.latencyMs}ms`);
      console.log(`Status: ${trace.status}`);
      console.log(`Role: ${trace.role}`);
      console.log(`Prompt Preview: ${trace.prompt?.slice(0, 300)}...`);
      console.log(`Response Preview: ${trace.response?.slice(0, 300)}...`);
      if (trace.error) {
        console.log(`Error: ${trace.error}`);
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    await mongoose.disconnect();
  }
}

run();
