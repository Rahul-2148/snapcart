// scripts/test-flash-deals.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

// Inline schema for testing
const flashDealSchema = new mongoose.Schema({
  groceryVariant: { type: mongoose.Schema.Types.ObjectId, ref: "GroceryVariant" },
  flashPrice: Number,
  startTime: Date,
  endTime: Date,
  dealStock: Number,
  soldCount: { type: Number, default: 0 },
  limitPerUser: { type: Number, default: 2 },
  isActive: { type: Boolean, default: true },
});

const FlashDeal = mongoose.models.FlashDeal || mongoose.model("FlashDeal", flashDealSchema);

async function main() {
  try {
    await mongoose.connect(MONGODB_URI!);
    const now = new Date();
    const count = await FlashDeal.countDocuments({
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    });
    console.log(`🔎 Active Flash Deals Count: ${count}`);

    // Register related schemas in mongoose
    const grocerySchema = new mongoose.Schema({});
    const groceryVariantSchema2 = new mongoose.Schema({
      grocery: { type: mongoose.Schema.Types.ObjectId, ref: "Grocery" },
    });
    mongoose.models.Grocery || mongoose.model("Grocery", grocerySchema);
    mongoose.models.GroceryVariant || mongoose.model("GroceryVariant", groceryVariantSchema2);

    const activeDeals = await FlashDeal.find({
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
      $expr: { $lt: ["$soldCount", "$dealStock"] },
    })
      .populate({
        path: "groceryVariant",
        populate: {
          path: "grocery",
        },
      })
      .lean();

    console.log("📄 Active Deals with Populate:", JSON.stringify(activeDeals, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

main();
