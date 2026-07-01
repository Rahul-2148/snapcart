import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "../src/lib/server/db";
import { Grocery } from "../src/models/grocery.model";

async function run() {
  try {
    await connectDb();
    console.log("Connected to DB.");

    const products = await Grocery.find().lean();
    products.forEach((p: any) => {
      console.log(`Product: ${p.name}`);
      console.log(`- has vectorEmbedding: ${!!p.vectorEmbedding}`);
      if (p.vectorEmbedding) {
        console.log(`- embedding length: ${p.vectorEmbedding.length}`);
      }
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    await mongoose.disconnect();
  }
}

run();
