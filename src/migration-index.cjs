// src/migration-index.cjs
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }
  
  await mongoose.connect(uri);
  console.log("Connected to DB:", uri);
  
  const db = mongoose.connection.db;
  const collections = await db.listCollections({ name: 'cartitems' }).toArray();
  if (collections.length === 0) {
    console.log("cartitems collection does not exist yet. No migration needed.");
    await mongoose.disconnect();
    return;
  }
  
  const cartItemsCol = db.collection('cartitems');
  const indexes = await cartItemsCol.listIndexes().toArray();
  console.log("Current indexes on cartitems:", indexes);
  
  // Find index that matches { cart: 1, variant: 1 }
  const targetIndex = indexes.find(idx => {
    const keys = Object.keys(idx.key);
    return keys.length === 2 && idx.key.cart === 1 && idx.key.variant === 1 && idx.unique;
  });
  
  if (targetIndex) {
    console.log("Found target unique index to drop:", targetIndex.name);
    await cartItemsCol.dropIndex(targetIndex.name);
    console.log("Successfully dropped index:", targetIndex.name);
  } else {
    console.log("No unique index on { cart, variant } found.");
  }
  
  // Create the new unique index
  console.log("Creating new unique index on cart, variant, and addedBy.memberId...");
  await cartItemsCol.createIndex(
    { cart: 1, variant: 1, "addedBy.memberId": 1 },
    { unique: true, name: "cart_1_variant_1_addedBy_memberId_1" }
  );
  console.log("Successfully created new unique index!");
  
  const finalIndexes = await cartItemsCol.listIndexes().toArray();
  console.log("Final indexes on cartitems:", finalIndexes);

  await mongoose.disconnect();
}

main().catch(console.error);
