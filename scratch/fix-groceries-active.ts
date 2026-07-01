import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import connectDb from "@/lib/server/db";
import { Grocery } from "@/models/grocery.model";

async function main() {
  await connectDb();
  const res = await Grocery.updateMany({}, { $set: { isActive: true } });
  console.log("Updated groceries:", res);
  process.exit(0);
}

main().catch(console.error);
