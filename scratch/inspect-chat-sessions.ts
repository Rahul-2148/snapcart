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

    const sessions = await ChatSession.find().sort({ updatedAt: -1 }).limit(5).lean();
    console.log(`Found ${sessions.length} recent sessions:`);
    
    for (const session of sessions) {
      console.log(`\n==================================================`);
      console.log(`Session ID: ${session._id}`);
      console.log(`Title: ${session.title}`);
      console.log(`Mode: ${session.mode}`);
      console.log(`Role: ${session.role}`);
      console.log(`Messages count: ${session.messages?.length}`);
      
      if (session.messages) {
        session.messages.forEach((msg: any, i: number) => {
          console.log(`  [Message ${i + 1}] Role: ${msg.role}`);
          console.log(`  Content: "${msg.content}"`);
        });
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    await mongoose.disconnect();
  }
}

run();
