import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Load env variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { runOrchestrator } from "@/lib/server/ai/agents/orchestrator";
import connectDb from "@/lib/server/db";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { Order } from "@/models/order.model";
import { User } from "@/models/user.model";
import { Coupon } from "@/models/coupon.model";

async function run() {
  try {
    console.log("Connecting to Database...");
    await connectDb();
    console.log("Connected to Database successfully.");

    // Setup: Get a real user, variant, and coupon to test tools on
    const sampleUser = await User.findOne().lean<{ _id: mongoose.Types.ObjectId }>();
    const userId = sampleUser ? sampleUser._id.toString() : "65d8c1c4e74e4c27f3b89b1c";
    console.log(`Using target User ID: ${userId}`);

    const sampleVariant = await GroceryVariant.findOne().lean<{ _id: mongoose.Types.ObjectId; label: string; price: { selling: number } }>();
    if (!sampleVariant) {
      console.warn("No grocery variants found in database! Some tools will fall back.");
    } else {
      console.log(`Using target Variant: ${sampleVariant.label} (ID: ${sampleVariant._id}, Price: ${sampleVariant.price.selling})`);
    }

    // 1. Test Customer Spend Analysis & Customer Segmentation
    console.log("\n--- TEST 1: Running Customer Segmentation ---");
    const segmentResult = await runOrchestrator({
      userId,
      role: "user",
      message: `Analyze my spending history and segment my profile.`
    });
    console.log("Segmentation Reply:", segmentResult.reply);
    console.log("Actions Executed:", JSON.stringify(segmentResult.actions, null, 2));

    // 2. Test Dynamic Pricing
    if (sampleVariant) {
      console.log("\n--- TEST 2: Running Dynamic Price Optimization ---");
      const pricingResult = await runOrchestrator({
        userId,
        role: "admin",
        message: `Optimize the pricing of variant ${sampleVariant._id} under a demand surge of 1.8 and heavy rain weather factor 1.3.`
      });
      console.log("Pricing Reply:", pricingResult.reply);
      console.log("Actions Executed:", JSON.stringify(pricingResult.actions, null, 2));
    }

    // 3. Test Reorder and Coupon Application
    console.log("\n--- TEST 3: Running Reorder & Coupon Application ---");
    const reorderResult = await runOrchestrator({
      userId,
      role: "user",
      message: "Please reorder my last delivery and apply the best discount coupon available."
    });
    console.log("Reorder Reply:", reorderResult.reply);
    console.log("Actions Executed:", JSON.stringify(reorderResult.actions, null, 2));

    console.log("\nAll integration orchestrator tests completed.");
    await mongoose.disconnect();
    console.log("Disconnected from Database successfully.");
  } catch (err) {
    console.error("Integration test script failed:", err);
    await mongoose.disconnect();
  }
}

run();
