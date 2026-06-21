// scripts/seed-stores.ts

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

// Import models
import { Store } from "../src/models/store.model.js";
import { StoreInventory } from "../src/models/storeInventory.model.js";
import { Grocery } from "../src/models/grocery.model.js";
import { GroceryVariant } from "../src/models/groceryVariant.model.js";
import { User } from "../src/models/user.model.js";
import bcrypt from "bcryptjs";

const demoStores = [
  {
    name: "SnapCart Koramangala",
    location: {
      type: "Point" as const,
      coordinates: [77.6245, 12.9352], // [longitude, latitude]
      address: "80 Feet Road, 4th Block, Koramangala",
      city: "Bangalore",
      state: "Karnataka",
      district: "Bangalore Urban",
      area: "Koramangala",
      pincode: "560034",
    },
    serviceRadiusKm: 7,
    openingHours: { open: "06:00", close: "23:00" },
    status: "active" as const,
    deliveryFee: { base: 25, freeAbove: 500 },
    estimatedDeliveryMinutes: { min: 8, max: 15 },
    contactPhone: "+919876543210",
  },
  {
    name: "SnapCart Indiranagar",
    location: {
      type: "Point" as const,
      coordinates: [77.6408, 12.9784],
      address: "100 Feet Road, HAL 2nd Stage, Indiranagar",
      city: "Bangalore",
      state: "Karnataka",
      district: "Bangalore Urban",
      area: "Indiranagar",
      pincode: "560038",
    },
    serviceRadiusKm: 5,
    openingHours: { open: "06:00", close: "23:00" },
    status: "active" as const,
    deliveryFee: { base: 25, freeAbove: 500 },
    estimatedDeliveryMinutes: { min: 10, max: 18 },
    contactPhone: "+919876543211",
  },
  {
    name: "SnapCart Connaught Place",
    location: {
      type: "Point" as const,
      coordinates: [77.2167, 28.6315],
      address: "Block E, Connaught Place",
      city: "New Delhi",
      state: "Delhi",
      district: "New Delhi",
      area: "Connaught Place",
      pincode: "110001",
    },
    serviceRadiusKm: 8,
    openingHours: { open: "05:00", close: "23:30" },
    status: "active" as const,
    deliveryFee: { base: 30, freeAbove: 600 },
    estimatedDeliveryMinutes: { min: 12, max: 20 },
    contactPhone: "+919876543212",
  },
  {
    name: "SnapCart Andheri",
    location: {
      type: "Point" as const,
      coordinates: [72.8697, 19.1136],
      address: "Andheri Kurla Road, Andheri East",
      city: "Mumbai",
      state: "Maharashtra",
      district: "Mumbai Suburban",
      area: "Andheri East",
      pincode: "400069",
    },
    serviceRadiusKm: 6,
    openingHours: { open: "06:00", close: "23:00" },
    status: "active" as const,
    deliveryFee: { base: 25, freeAbove: 500 },
    estimatedDeliveryMinutes: { min: 9, max: 16 },
    contactPhone: "+919876543213",
  },
  {
    name: "SnapCart Koderma",
    location: {
      type: "Point" as const,
      coordinates: [85.5941, 24.4684],
      address: "Station Road, Koderma",
      city: "Koderma",
      state: "Jharkhand",
      district: "Koderma",
      area: "Station Road",
      pincode: "825410",
    },
    serviceRadiusKm: 10,
    openingHours: { open: "07:00", close: "22:00" },
    status: "active" as const,
    deliveryFee: { base: 20, freeAbove: 400 },
    estimatedDeliveryMinutes: { min: 15, max: 25 },
    contactPhone: "+919876543214",
  },
];

async function seedStores() {
  try {
    console.log("🌱 Starting store and inventory seeding...");

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not found in environment variables");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Clear existing stores
    await Store.deleteMany({});
    console.log("🗑️ Cleared existing stores");

    // Clear existing store inventories
    await StoreInventory.deleteMany({});
    console.log("🗑️ Cleared existing store inventory records");

    // Seed/find manager account
    const managerEmail = "manager@snapcart.com";
    const hashedPassword = await bcrypt.hash("Password123", 10);
    let managerUser = await User.findOne({ email: managerEmail });
    if (!managerUser) {
      managerUser = await User.create({
        name: "Store Manager",
        email: managerEmail,
        password: hashedPassword,
        mobileNumber: "9876543210",
        roles: ["storeManager"],
        currentRole: "storeManager",
        profileCompleted: true,
      });
      console.log("👤 Created test store manager account (manager@snapcart.com / Password123)");
    } else {
      if (!managerUser.roles.includes("storeManager")) {
        managerUser.roles.push("storeManager");
        managerUser.currentRole = "storeManager";
        await managerUser.save();
      }
      console.log("👤 Test store manager account already exists");
    }

    // Insert demo stores
    const demoStoresWithSlugs = demoStores.map(store => {
      const slugBase = store.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const id = new mongoose.Types.ObjectId();
      return {
        ...store,
        _id: id,
        slug: `${slugBase}-${id.toString().slice(-5)}`,
        manager: store.name.includes("Koramangala") ? managerUser._id : null,
      };
    });

    const insertedStores = await Store.insertMany(demoStoresWithSlugs);
    console.log(`✅ Seeded ${insertedStores.length} demo stores`);

    // Fetch all existing groceries and their variants to map into store inventory
    const groceries = await Grocery.find({});
    const variants = await GroceryVariant.find({});

    if (groceries.length === 0 || variants.length === 0) {
      console.warn("⚠️ No existing groceries or variants found. Store inventory mapping skipped.");
      console.log("💡 Try adding some products in the admin panel first.");
    } else {
      console.log(`📦 Found ${groceries.length} groceries and ${variants.length} variants to assign`);
      
      const inventoryRecords: any[] = [];

      for (const store of insertedStores) {
        for (const variant of variants) {
          // Find matching grocery for this variant
          const grocery = groceries.find(g => g._id.toString() === variant.grocery.toString());
          if (!grocery) continue;

          inventoryRecords.push({
            store: store._id,
            grocery: grocery._id,
            variant: variant._id,
            stock: Math.floor(Math.random() * 80) + 20, // Random stock between 20 and 100
            isAvailable: true,
          });
        }
      }

      if (inventoryRecords.length > 0) {
        await StoreInventory.insertMany(inventoryRecords);
        console.log(`✅ Mapped ${inventoryRecords.length} inventory records to stores`);
      }
    }

    await mongoose.disconnect();
    console.log("✅ Database disconnected");
    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding stores:", error);
    process.exit(1);
  }
}

seedStores();
