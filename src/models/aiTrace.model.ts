import mongoose, { Document, Schema } from "mongoose";

export interface IAiTrace extends Document {
  sessionId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  role: string;
  provider: string;               // 'gemini', 'openai', 'claude'
  llmModel: string;               // 'gemini-2.5-flash', 'gpt-4o' (renamed from model to avoid Mongoose clash)
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
  latencyMs: number;
  status: "success" | "failure";
  error?: string;
  taskType: string;               // 'chat', 'recommendation', 'agent_orchestration', 'vision'
  createdAt: Date;
}

const AiTraceSchema = new Schema<IAiTrace>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "ChatSession", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    role: { type: String, required: true },
    provider: { type: String, required: true },
    llmModel: { type: String, required: true },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    costUSD: { type: Number, default: 0 },
    latencyMs: { type: Number, required: true },
    status: { type: String, enum: ["success", "failure"], required: true, index: true },
    error: { type: String },
    taskType: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  }
);

// Optimize metrics queries
AiTraceSchema.index({ provider: 1, llmModel: 1, status: 1 });

export const AiTrace =
  mongoose.models.AiTrace ||
  mongoose.model<IAiTrace>("AiTrace", AiTraceSchema);
