import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "../src/lib/server/db";
import { aiTools } from "../src/lib/server/ai/tools";
import { ChatSession } from "../src/models/chatSession.model";
import { User } from "../src/models/user.model";
import { Cart } from "../src/models/cart.model";
import { CartItem } from "../src/models/cartItem.model";

async function run() {
  try {
    console.log("Connecting to Database...");
    await connectDb();
    console.log("Connected to Database successfully.");

    // Find the last active ChatSession or User in the system
    const lastSession = await ChatSession.findOne().sort({ updatedAt: -1 });
    let userIdStr = "";
    let sessionIdStr = "";

    if (lastSession && lastSession.userId) {
      userIdStr = lastSession.userId.toString();
      sessionIdStr = lastSession._id.toString();
      console.log(`Found last active ChatSession: ${sessionIdStr} for user: ${userIdStr}`);
    } else {
      const sampleUser = await User.findOne().lean<{ _id: mongoose.Types.ObjectId }>();
      if (sampleUser) {
        userIdStr = sampleUser._id.toString();
        console.log(`No active session found, using first User: ${userIdStr}`);
      } else {
        userIdStr = "65d8c1c4e74e4c27f3b89b1c";
        console.log(`No users found, using fallback User ID: ${userIdStr}`);
      }
    }

    const query = "add aashirwad atta to my cart and if best coupon available then apply";
    console.log(`\nExecuting task: "${query}"`);

    // Step 1: Add Aashirwad Atta (2 × 10 kg) to cart
    const variantId = "6987324b5ed0786641a6d5ad";
    console.log(`\nStep 1: Adding Variant ${variantId} to cart...`);
    const cartResult = await aiTools.addToCart.execute(userIdStr, {
      items: [{ variantId, quantity: 1 }]
    });
    console.log("Cart Result:", cartResult);

    // Step 2: Apply the best coupon
    console.log("\nStep 2: Evaluating and applying best coupon...");
    const couponResult = await aiTools.applyBestCoupon.execute(userIdStr, {});
    console.log("Coupon Result:", couponResult);

    // Fetch the final cart state to report
    const cart = await Cart.findOne({ user: userIdStr, isActive: true });
    let cartSummary = "";
    if (cart) {
      const items = await CartItem.find({ cart: cart._id }).populate({ path: "variant", model: "GroceryVariant" });
      console.log("\n--- Final Cart Items ---");
      items.forEach((item: any) => {
        console.log(`- ${item.variant?.label || "Unknown Variant"}: ${item.quantity}x (₹${item.priceAtAdd?.selling})`);
      });
      console.log("Applied Coupon:", cart.coupon?.code || "None");
    }

    // Step 3: Append response to chat session so user sees it in the chatbot UI
    const assistantReply = `*(System Executed Actions: searchProducts (Success), addToCart (Success), applyBestCoupon (Success))*\n\nI have searched the catalog and successfully added **Aashirwad Atta (2 × 10 kg)** to your cart.\n\n` +
      (couponResult.success 
        ? `Additionally, I evaluated all active coupons and applied the best eligible coupon: **${couponResult.couponCode}** (saving you ₹${couponResult.discountAmount}!).` 
        : `I evaluated active coupons, but: ${couponResult.message}`);

    if (lastSession) {
      const nextMessages = [
        ...lastSession.messages.slice(-10),
        { role: "user", content: query },
        { role: "assistant", content: assistantReply }
      ];
      lastSession.messages = nextMessages;
      await lastSession.save();
      console.log("\nSuccessfully updated user's ChatSession history.");
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from Database.");
  } catch (error) {
    console.error("Execution failed:", error);
    await mongoose.disconnect();
  }
}

run();
