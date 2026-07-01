import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No GEMINI_API_KEY configured");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const json = await response.json();
    console.log("Status:", response.status);
    
    if (response.ok && json.models) {
      console.log("\n--- Active Models ---");
      json.models.forEach((m: any) => {
        console.log(`- ${m.name} (${m.displayName}) - Supported Actions: ${m.supportedGenerationMethods.join(", ")}`);
      });
    } else {
      console.log("Error response:", JSON.stringify(json, null, 2));
    }
  } catch (err: any) {
    console.error("Fetch exception:", err.message);
  }
}

run();
