// scripts/query-stores.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }
  
  await mongoose.connect(uri);
  console.log("Connected to DB:", uri);
  
  const Store = mongoose.models.Store || mongoose.model("Store", new mongoose.Schema({}, { strict: false }));
  const stores = await Store.find({});
  console.log("Stores found in DB:", stores.length);
  for (const store of stores) {
    console.log({
      id: store._id,
      name: store.name,
      status: store.status,
      coordinates: store.location?.coordinates,
      address: store.location?.address,
      serviceRadiusKm: store.serviceRadiusKm,
      openingHours: store.openingHours,
    });
  }

  const DeliverySettings = mongoose.models.DeliverySettings || mongoose.model("DeliverySettings", new mongoose.Schema({}, { strict: false }));
  const settings = await DeliverySettings.findOne({});
  console.log("Delivery settings in DB:", settings);

  await mongoose.disconnect();
}

main().catch(console.error);
