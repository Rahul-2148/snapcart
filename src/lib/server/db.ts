// src/lib/server/db.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

// Global cached connection across hot reloads (serverless safe)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDb = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Use options recommended for serverless
    cached.promise = mongoose
      .connect(MONGODB_URI, {
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
