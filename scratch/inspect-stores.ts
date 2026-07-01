import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";

async function main() {
  await connectDb();
  const stores = await Store.find({}).lean();
  console.log("Total stores in DB:", stores.length);
  for (const store of stores) {
    console.log({
      _id: store._id,
      name: store.name,
      status: store.status,
      openingHours: store.openingHours,
      location: store.location,
    });
  }
  process.exit(0);
}

main().catch(console.error);
