import fs from "fs";
import path from "path";

// Load .env.local manually before other imports
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    let val = trimmed.slice(index + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

import dbConnect from "../src/lib/server/db";
import { callAiGateway, getGatewayEmbeddings, providerStats } from "../src/lib/server/ai/gateway";

async function main() {
  console.log("Connecting to database...");
  await dbConnect();
  console.log("Connected successfully!");

  console.log("\n--- Testing Embeddings Generation ---");
  const embedding = await getGatewayEmbeddings("Aashirvaad Atta, fresh whole wheat flour");
  if (embedding && embedding.length > 0) {
    console.log(`Success! Generated embedding of length: ${embedding.length}`);
    console.log(`First 5 dimensions: ${embedding.slice(0, 5).join(", ")}`);
  } else {
    console.error("Failed to generate embeddings.");
  }

  console.log("\n--- Testing AI Gateway Call ---");
  const response = await callAiGateway({
    role: "user",
    prompt: "Hello! List 3 popular Indian grocery items in a simple comma separated line.",
    taskType: "chat",
    systemInstruction: "Be extremely concise, output only the comma separated values.",
  });

  console.log("Gateway Response status:", response.success ? "SUCCESS" : "FAILED");
  console.log("Gateway Response Model:", response.model);
  console.log("Gateway Reply:", response.reply);

  console.log("\n--- Testing Concurrent Call Queue & Cache ---");
  console.log("Triggering 3 parallel requests (expecting queue logic to orchestrate)...");
  
  const startTime = Date.now();
  const promises = Array.from({ length: 3 }).map((_, idx) => 
    callAiGateway({
      role: "user",
      prompt: `Translate the word 'Grocery' to Hindi. ID=${idx}`,
      taskType: "chat",
      systemInstruction: "Reply with exactly one word.",
    })
  );

  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  
  results.forEach((res, idx) => {
    console.log(`Result ${idx} (Model: ${res.model}): ${res.reply}`);
  });
  console.log(`Parallel execution took ${totalTime}ms`);

  console.log("\n--- Printing Provider Metrics ---");
  console.log(JSON.stringify(providerStats, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
