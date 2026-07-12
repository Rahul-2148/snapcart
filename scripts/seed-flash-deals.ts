// scripts/seed-flash-deals.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in environment variables.");
  process.exit(1);
}

// Inline schemas for seeding
const groceryVariantSchema = new mongoose.Schema({
  grocery: { type: mongoose.Schema.Types.ObjectId, ref: "Grocery" },
  label: String,
  price: {
    mrp: Number,
    selling: Number,
  },
  countInStock: Number,
});

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

const GroceryVariant = mongoose.models.GroceryVariant || mongoose.model("GroceryVariant", groceryVariantSchema);
const FlashDeal = mongoose.models.FlashDeal || mongoose.model("FlashDeal", flashDealSchema);

async function main() {
  try {
    console.log("⏳ Connecting to Database...");
    await mongoose.connect(MONGODB_URI!);
    console.log("✅ Connected to Database.");

    // Clear existing flash deals
    await FlashDeal.deleteMany({});
    console.log("🧹 Cleared existing flash deals.");

    // Find some variants
    const variants = await GroceryVariant.find({}).limit(5);

    if (variants.length === 0) {
      console.log("⚠️ No variants found in the database. Please add groceries/variants first.");
      process.exit(0);
    }

    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const deals = variants.map((v) => {
      // Set flash price to roughly 50-60% of MRP or selling price
      const originalPrice = v.price.selling;
      const flashPrice = Math.round(originalPrice * 0.5);

      return {
        groceryVariant: v._id,
        flashPrice: flashPrice > 0 ? flashPrice : 10,
        startTime: now,
        endTime: twentyFourHoursLater,
        dealStock: 30,
        soldCount: 0,
        limitPerUser: 2,
        isActive: true,
      };
    });

    await FlashDeal.insertMany(deals);
    console.log(`🎉 Successfully seeded ${deals.length} active lightning flash deals!`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

main();
