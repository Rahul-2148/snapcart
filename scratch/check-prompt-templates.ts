import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDb from "../src/lib/server/db";
import { AiPromptTemplate } from "../src/models/aiPromptTemplate.model";

async function run() {
  await connectDb();
  console.log("Connected to DB.");

  const templates = await AiPromptTemplate.find().lean();
  console.log("Active templates in DB count:", templates.length);
  templates.forEach(t => {
    console.log(`- Template Name: ${t.name}, isActive: ${t.isActive}`);
  });

  await mongoose.disconnect();
}

run();
