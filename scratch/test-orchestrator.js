const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load env variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });

// Import models
require("../src/models/userAiProfile.model");
require("../src/models/aiMemory.model");
require("../src/models/aiPromptTemplate.model");
require("../src/models/aiTrace.model");
require("../src/models/chatSession.model");
require("../src/models/grocery.model");
require("../src/models/groceryVariant.model");
require("../src/models/coupon.model");
require("../src/models/user.model");

const { runOrchestrator } = require("../src/lib/server/ai/agents/orchestrator");

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log("Connecting to DB:", mongoUri ? "Configured" : "MISSING");
    await mongoose.connect(mongoUri);
    console.log("Connected to DB successfully.");

    console.log("Executing Orchestrator test...");
    const result = await runOrchestrator({
      userId: "000000000000000000000000",
      role: "user",
      message: "hi suggest high protein foods"
    });

    console.log("Orchestrator result:", JSON.stringify(result, null, 2));
    await mongoose.disconnect();
  } catch (error) {
    console.error("Orchestrator test failed:", error);
  }
}

run();
