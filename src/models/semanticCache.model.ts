import mongoose, { Document, Schema } from "mongoose";

export interface ISemanticCache extends Document {
  prompt: string;
  systemInstruction?: string;
  reply: string;
  llmModel: string;
  embedding: number[];
  createdAt: Date;
}

const SemanticCacheSchema = new Schema<ISemanticCache>({
  prompt: { type: String, required: true, index: true },
  systemInstruction: { type: String },
  reply: { type: String, required: true },
  llmModel: { type: String, required: true },
  embedding: { type: [Number], required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 * 7, index: true } // 7 days TTL
});

export const SemanticCache =
  mongoose.models.SemanticCache ||
  mongoose.model<ISemanticCache>("SemanticCache", SemanticCacheSchema);
