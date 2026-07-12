// scripts/test-db-deals.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

// Import the actual models
import { FlashDeal } from "../src/models/flashDeal.model";
import "../src/models/groceryVariant.model";
import "../src/models/grocery.model";

async function main() {
  try {
    console.log("⏳ Connecting to Database...");
    await mongoose.connect(MONGODB_URI!);
    console.log("✅ Connected.");

    const now = new Date();
    const count = await FlashDeal.countDocuments({});
    console.log(`Total Flash Deals: ${count}`);

    const activeDeals = await FlashDeal.find({
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    })
      .populate({
        path: "groceryVariant",
        populate: {
          path: "grocery",
        },
      })
      .lean();

    console.log("Active deals populated:", JSON.stringify(activeDeals, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

main();
