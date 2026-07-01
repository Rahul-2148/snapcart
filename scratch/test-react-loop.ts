import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { runOrchestrator } from "../src/lib/server/ai/agents/orchestrator";
import connectDb from "../src/lib/server/db";
import { User } from "../src/models/user.model";
import { ChatSession } from "../src/models/chatSession.model";
import { Cart } from "../src/models/cart.model";
import { CartItem } from "../src/models/cartItem.model";

async function run() {
  try {
    console.log("Connecting to Database...");
    await connectDb();
    console.log("Connected to Database successfully.");

    // Find the last active user in the system
    const lastSession = await ChatSession.findOne().sort({ updatedAt: -1 }).lean<{ userId: mongoose.Types.ObjectId }>();
    let userIdStr = "";
    
    if (lastSession && lastSession.userId) {
      userIdStr = lastSession.userId.toString();
    } else {
      const sampleUser = await User.findOne().lean<{ _id: mongoose.Types.ObjectId }>();
      userIdStr = sampleUser ? sampleUser._id.toString() : "65d8c1c4e74e4c27f3b89b1c";
    }

    console.log(`Using User ID: ${userIdStr}`);

    // Let's clear the user's cart first to have a clean slate
    const cart = await Cart.findOne({ user: userIdStr, isActive: true });
    if (cart) {
      await CartItem.deleteMany({ cart: cart._id });
      console.log("Cleared cart for test.");
    }

    const query = "5kg apple fruit add krdo";
    console.log(`\nExecuting ReAct Loop query: "${query}"`);

    const result = await runOrchestrator({
      userId: userIdStr,
      role: "user",
      message: query,
      mode: "agent"
    });

    console.log("\n--- AGENT FINAL REPLY ---");
    console.log(result.reply);
    console.log("\n--- ACTIONS EXECUTED ---");
    console.log(JSON.stringify(result.actions, null, 2));

    // Verify if variant was added to the cart
    const finalCart = await Cart.findOne({ user: userIdStr, isActive: true });
    if (finalCart) {
      const items = await CartItem.find({ cart: finalCart._id }).populate({ path: "variant", model: "GroceryVariant" });
      console.log("\n--- Final Cart Items ---");
      items.forEach((item: any) => {
        console.log(`- ${item.variant?.label || "Unknown"}: ${item.quantity}x (price: ₹${item.priceAtAdd?.selling})`);
      });
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from Database.");
  } catch (error) {
    console.error("Execution failed:", error);
    await mongoose.disconnect();
  }
}

run();
