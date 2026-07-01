import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { runOrchestrator } from "../src/lib/server/ai/agents/orchestrator";
import connectDb from "../src/lib/server/db";
import { User } from "../src/models/user.model";

async function run() {
  try {
    console.log("Connecting to Database...");
    await connectDb();
    console.log("Connected.");

    const user = await User.findOne().lean<{ _id: mongoose.Types.ObjectId }>();
    const userIdStr = user ? user._id.toString() : "65d8c1c4e74e4c27f3b89b1c";

    console.log("\nRunning orchestrator in normal (Q&A) mode for query: \"i want fruits\"...");
    const result = await runOrchestrator({
      userId: userIdStr,
      role: "user",
      message: "i want fruits",
      mode: "normal"
    });

    console.log("\n--- Q&A REPLY ---");
    console.log(result.reply);
    console.log("\n--- PRODUCTS COLLECTED IN CONTEXT ---");
    console.log(JSON.stringify(result.products?.map((p: any) => p.name), null, 2));

    await mongoose.disconnect();
    console.log("\nDisconnected.");
  } catch (error) {
    console.error("Q&A test failed:", error);
    await mongoose.disconnect();
  }
}

run();
