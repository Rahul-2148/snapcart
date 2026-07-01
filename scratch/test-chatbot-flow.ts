import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "@/lib/server/db";
import { runOrchestrator } from "@/lib/server/ai/agents/orchestrator";

async function run() {
  try {
    console.log("Connecting to DB...");
    await connectDb();
    
    console.log("Running runOrchestrator for '10 pack'...");
    const result = await runOrchestrator({
      userId: "000000000000000000000000",
      role: "guest",
      message: "10 pack",
      mode: "agent",
    });

    console.log("\nOrchestrator Result:");
    console.log(JSON.stringify(result, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error("Orchestrator test failed:", error);
  }
}

run();
