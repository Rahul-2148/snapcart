import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { runOrchestrator } from "../src/lib/server/ai/agents/orchestrator";
import connectDb from "../src/lib/server/db";
import { User } from "../src/models/user.model";
import { ChatSession } from "../src/models/chatSession.model";

async function run() {
  try {
    console.log("Connecting to Database...");
    await connectDb();
    console.log("Connected to Database successfully.");

    // Find the last active user with a chat session or a user in the system
    const lastSession = await ChatSession.findOne().sort({ updatedAt: -1 }).lean<{ userId: mongoose.Types.ObjectId }>();
    let userIdStr = "";
    
    if (lastSession && lastSession.userId) {
      userIdStr = lastSession.userId.toString();
      console.log(`Found last active ChatSession user: ${userIdStr}`);
    } else {
      const sampleUser = await User.findOne().lean<{ _id: mongoose.Types.ObjectId }>();
      if (sampleUser) {
        userIdStr = sampleUser._id.toString();
        console.log(`No active session found, falling back to first User: ${userIdStr}`);
      } else {
        userIdStr = "65d8c1c4e74e4c27f3b89b1c";
        console.log(`No users found in database, using fallback User ID: ${userIdStr}`);
      }
    }

    console.log("\nExecuting User Request via Orchestrator...");
    const result = await runOrchestrator({
      userId: userIdStr,
      role: "user",
      message: "add aashirwad atta to my cart and if best coupon available then apply"
    });

    console.log("\n--- ORCHESTRATOR REPLY ---");
    console.log(result.reply);
    console.log("\n--- ACTIONS EXECUTED ---");
    console.log(JSON.stringify(result.actions, null, 2));

    await mongoose.disconnect();
    console.log("\nDisconnected from Database.");
  } catch (error) {
    console.error("Execution failed:", error);
    await mongoose.disconnect();
  }
}

run();
