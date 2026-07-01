import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "../src/lib/server/db";
import { ChatSession } from "../src/models/chatSession.model";

async function run() {
  try {
    await connectDb();
    console.log("Connected to DB.");

    // Simulate history sent from frontend (which includes the user's latest query)
    const history = [
      { role: "assistant", content: "Namaste!" },
      { role: "user", content: "i want fruits" } // frontend has already appended the user's current message
    ];

    const message = "i want fruits";
    const reply = "I found Apple Fruit in stock.";
    
    // Simulate our new slice logic:
    const nextMessages = [
      ...history.slice(0, -1).slice(-10),
      { role: "user", content: message },
      { role: "assistant", content: reply }
    ];

    console.log("Simulated history array:", JSON.stringify(history, null, 2));
    console.log("New database messages array:", JSON.stringify(nextMessages, null, 2));

    // Verify there are no consecutive duplicate user messages
    let hasDuplicates = false;
    for (let i = 0; i < nextMessages.length - 1; i++) {
      if (nextMessages[i].role === "user" && nextMessages[i+1].role === "user") {
        hasDuplicates = true;
      }
    }
    console.log("Has consecutive duplicate user messages:", hasDuplicates);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    await mongoose.disconnect();
  }
}

run();
