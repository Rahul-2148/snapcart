import mongoose, { Document, Schema } from "mongoose";

export interface IAiMemory extends Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  category: "diet" | "finance" | "interaction" | "general";
  vectorEmbedding: number[];          // 1536 dimension vector for MongoDB Atlas Vector Search
  lastAccessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AiMemorySchema = new Schema<IAiMemory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: ["diet", "finance", "interaction", "general"],
      required: true,
      index: true,
    },
    vectorEmbedding: { type: [Number], required: true },
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// We index userId and category for direct queries
AiMemorySchema.index({ userId: 1, category: 1 });

export const AiMemory =
  mongoose.models.AiMemory ||
  mongoose.model<IAiMemory>("AiMemory", AiMemorySchema);
