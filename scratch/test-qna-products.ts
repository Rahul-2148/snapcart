import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { runOrchestrator } from "../src/lib/server/ai/agents/orchestrator";
import connectDb from "../src/lib/server/db";

async function run() {
  try {
    console.log("Connecting to Database...");
    await connectDb();
    console.log("Connected to Database successfully.");

    const query = "give apple products details";
    console.log(`\nExecuting Q&A mode query: "${query}"`);

    const result = await runOrchestrator({
      userId: "65d8c1c4e74e4c27f3b89b1c",
      role: "user",
      message: query,
      mode: "normal"
    });

    console.log("\n--- Q&A REPLY ---");
    console.log(result.reply);

    await mongoose.disconnect();
    console.log("\nDisconnected from Database.");
  } catch (error) {
    console.error("Execution failed:", error);
    await mongoose.disconnect();
  }
}

run();
