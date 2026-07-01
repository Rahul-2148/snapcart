import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Import models to register
import "@/models/userAiProfile.model";
import "@/models/aiMemory.model";
import "@/models/aiPromptTemplate.model";
import "@/models/aiTrace.model";
import "@/models/chatSession.model";
import "@/models/grocery.model";
import "@/models/groceryVariant.model";
import "@/models/coupon.model";
import "@/models/user.model";

import { runOrchestrator } from "@/lib/server/ai/agents/orchestrator";

// Mock module alias mapping since Next.js uses @/
// tsx supports tsconfig paths automatically if we pass it or run with tsx!

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log("Connecting to DB:", mongoUri ? "Configured" : "MISSING");
    if (!mongoUri) throw new Error("MONGODB_URI missing");
    await mongoose.connect(mongoUri);
    console.log("Connected to DB successfully.");

    console.log("Executing Orchestrator test...");
    const result = await runOrchestrator({
      userId: "000000000000000000000000",
      role: "user",
      message: "hi suggest high protein foods"
    });

    console.log("Orchestrator result:", JSON.stringify(result, null, 2));
    await mongoose.disconnect();
  } catch (error) {
    console.error("Orchestrator test failed:", error);
  }
}

run();
