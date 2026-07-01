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

// In ES modules project, we can load the dynamically transpiled TS files.
// Let's resolve the orchestrator module. Node will compile TS files if register hook is used,
// or we can test using ts-node or simply load our compiled JS.
// Wait, we can run it using npx tsx scratch/test-orchestrator.ts since tsx supports TS and ESM out of the box!
// That's much cleaner! Let's write a TS version of the test script and run it with `npx tsx`!
