import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../src/models/user.model";
import GiftCard from "../src/models/giftCard.model";

// Load env variables
dotenv.config({ path: "c:/Users/Rahul Raj Modi/OneDrive/Desktop/Full stack Projects/snapcart-Grocery Next.js/.env.local" });

function generateCardCode() {
  let code = "";
  for (let i = 0; i < 16; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

function generatePin() {
  let pin = "";
  for (let i = 0; i < 6; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("URI is empty");
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  const testEmail = "rahulraj21480@gmail.com";
  console.log("Searching user:", testEmail);
  const currentUser = await User.findOne({ email: testEmail });
  if (!currentUser) {
    console.error("User not found in DB!");
    mongoose.disconnect();
    return;
  }
  console.log("Found user ID:", currentUser._id);

  const testOrderId = "order_test_" + Date.now();
  const uniqueCode = generateCardCode();
  const generatedPin = generatePin();

  console.log("Creating new test gift card...");
  const newCard = new GiftCard({
    code: uniqueCode,
    pin: generatedPin,
    amount: 10,
    status: "active",
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    razorpayOrderId: testOrderId,
    purchasedBy: currentUser._id,
  });

  console.log("Saving test gift card...");
  const saved = await newCard.save();
  console.log("Saved successfully:", saved);

  // Clean up test card
  await GiftCard.deleteOne({ _id: saved._id });
  console.log("Deleted test card.");

  mongoose.disconnect();
}

main().catch(err => {
  console.error("Error in mock execution:", err);
  mongoose.disconnect();
});
