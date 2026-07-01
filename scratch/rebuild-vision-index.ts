import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "../src/lib/server/db";
import { GroceryVariant } from "../src/models/groceryVariant.model";
import { Grocery } from "../src/models/grocery.model";

async function run() {
  try {
    await connectDb();
    console.log("Connected to MongoDB.");
    
    const variants = await GroceryVariant.find({}).populate({
      path: "grocery",
      model: Grocery
    });
    
    console.log(`Found ${variants.length} variants in database.`);
    
    const indexItems = variants
      .map((v) => {
        const parent = v.grocery as any;
        const imageUrl = parent?.images?.[0]?.url;
        if (!imageUrl) return null;
        return {
          id: v._id.toString(),
          image_url: imageUrl
        };
      })
      .filter(Boolean);
      
    console.log(`Preparing to send ${indexItems.length} items to FastAPI...`);
    
    const response = await fetch("http://127.0.0.1:8000/vision/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variants: indexItems })
    });
    
    console.log("FastAPI Response Status:", response.status);
    const result = await response.json();
    console.log("FastAPI Response:", result);
  } catch (err) {
    console.error("Error rebuilding index:", err);
  } finally {
    process.exit(0);
  }
}

run();
