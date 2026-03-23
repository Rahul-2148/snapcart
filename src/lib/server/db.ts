// src/lib/server/db.ts
import mongoose from "mongoose";

// Import all models to ensure schemas are registered
import "@/models/grocery.model";
import "@/models/category.model";
import "@/models/order.model";
import "@/models/user.model";
import "@/models/returnRequest.model";
import "@/models/adminSettings.model";
import "@/models/newsletterSubscriber.model";
import "@/models/wishlist.model";
import "@/models/wishlistFollow.model";

// Global cached connection across hot reloads (serverless safe)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDb = async () => {
  const mongodbUri = process.env.MONGODB_URI;

  if (!mongodbUri) {
    throw new Error(
      "MONGODB_URI is not defined. Set it in your environment variables.",
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Use options recommended for serverless
    cached.promise = mongoose
      .connect(mongodbUri, {
        bufferCommands: false, // prevent mongoose buffering
        serverSelectionTimeoutMS: 5000, // fail fast if db is unreachable
      })
      .then((mongooseInstance) => mongooseInstance.connection);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    cached.promise = null; // reset promise on failure
    throw error;
  }
};

export default connectDb;
