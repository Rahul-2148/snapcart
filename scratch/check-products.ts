import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected directly via Mongoose.");
  const db = mongoose.connection.db;
  if (!db) {
    console.error("DB connection failed");
    process.exit(1);
  }
  const groceries = await db.collection("groceries").find({}).toArray();
  for (const g of groceries) {
    console.log("-----------------------------------------");
    console.log("Name:", g.name);
    console.log("Brand:", g.brand);
    console.log("Description:", g.description);
  }
  process.exit(0);
}
run();
