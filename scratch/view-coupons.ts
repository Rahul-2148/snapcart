import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "../src/lib/server/db";
import { Coupon } from "../src/models/coupon.model";

async function run() {
  await connectDb();
  console.log("Connected to DB.");

  const coupons = await Coupon.find().lean();
  console.log("All Coupons in DB:", coupons.map(c => ({
    code: c.code,
    discountType: c.discountType,
    discountValue: c.discountValue,
    minCartValue: c.minCartValue,
    isActive: c.isActive
  })));

  await mongoose.disconnect();
}

run();
