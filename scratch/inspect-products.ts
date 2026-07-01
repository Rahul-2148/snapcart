import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import connectDb from "@/lib/server/db";
import { Grocery } from "@/models/grocery.model";

async function main() {
  await connectDb();
  const groceries = await Grocery.find({}).lean();
  console.log("Total groceries in DB:", groceries.length);
  for (const g of groceries.slice(0, 5)) {
    console.log({
      _id: g._id,
      name: g.name,
      status: g.status,
      category: g.category,
    });
  }
  process.exit(0);
}

main().catch(console.error);
