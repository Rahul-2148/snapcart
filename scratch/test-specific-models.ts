import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const models = [
  "gemini-2.0-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite"
];

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No GEMINI_API_KEY configured");
    return;
  }

  for (const model of models) {
    console.log(`\n--- Testing Model: ${model} ---`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const requestBody = {
      contents: [{ role: "user", parts: [{ text: "Hello" }] }]
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      console.log(`Status: ${response.status} ${response.statusText}`);
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        if (response.ok) {
          console.log(`Success! Candidate reply: "${json.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}"`);
        } else {
          console.log("Error response:", JSON.stringify(json.error, null, 2));
        }
      } catch {
        console.log("Raw response (not JSON):", text.substring(0, 500));
      }
    } catch (err: any) {
      console.error(`Fetch exception for ${model}:`, err.message);
    }
    // Small sleep between requests to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }
}

testModels();
