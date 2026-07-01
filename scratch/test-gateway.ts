import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "@/lib/server/db";
import { callAiGateway } from "@/lib/server/ai/gateway";

async function run() {
  try {
    console.log("Connecting to DB...");
    await connectDb();
    console.log("Connected to DB. Testing callAiGateway directly...");
    
    const result = await callAiGateway({
      userId: "000000000000000000000000",
      role: "user",
      prompt: "Suggest high protein foods",
      taskType: "agent_orchestration"
    });

    console.log("Gateway Result:", JSON.stringify(result, null, 2));
    await mongoose.disconnect();
  } catch (error) {
    console.error("Gateway test failed:", error);
  }
}

run();
