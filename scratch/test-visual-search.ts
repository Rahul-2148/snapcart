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
    
    // Find a variant that has an image
    const variants = await GroceryVariant.find({}).populate({
      path: "grocery",
      model: Grocery
    });
    
    const variantWithImage = variants.find(v => (v.grocery as any)?.images?.[0]?.url);
    if (!variantWithImage) {
      console.error("No variants with images found in DB.");
      return;
    }
    
    const imageUrl = (variantWithImage.grocery as any).images[0].url;
    console.log(`Using variant: ${variantWithImage.label} (${variantWithImage._id}) with image: ${imageUrl}`);
    
    // Download the image
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      console.error("Failed to download image:", imageUrl);
      return;
    }
    const blob = await imgResponse.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Test 1: Query FastAPI directly
    console.log("\n--- Testing FastAPI /vision/search directly ---");
    const fastapiFormData = new FormData();
    const file = new File([buffer], "product.jpg", { type: "image/jpeg" });
    fastapiFormData.append("file", file);
    fastapiFormData.append("k", "5");
    
    try {
      const fastapiRes = await fetch("http://127.0.0.1:8000/vision/search", {
        method: "POST",
        body: fastapiFormData,
      });
      
      console.log("FastAPI Response Status:", fastapiRes.status);
      const data = await fastapiRes.json();
      console.log("FastAPI matches:", JSON.stringify(data, null, 2));
    } catch (err: any) {
      console.error("FastAPI search failed:", err.message);
    }
    
    // Test 2: Query Next.js API route /api/vision/search
    console.log("\n--- Testing Next.js /api/vision/search ---");
    const nextFormData = new FormData();
    nextFormData.append("file", file);
    nextFormData.append("k", "5");
    
    try {
      const nextRes = await fetch("http://localhost:3000/api/vision/search", {
        method: "POST",
        body: nextFormData,
      });
      console.log("Next.js API Response Status:", nextRes.status);
      const nextData = await nextRes.json();
      console.log("Next.js response:", JSON.stringify(nextData, null, 2));
    } catch (err: any) {
      console.error("Next.js API search failed:", err.message);
    }
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
