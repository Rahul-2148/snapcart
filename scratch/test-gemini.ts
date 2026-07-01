import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const response = await fetch(url);
    console.log("Status:", response.status, response.statusText);
    const json = await response.json();
    console.log("Supported Models:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

listModels();
