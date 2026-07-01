import { AiTrace } from "@/models/aiTrace.model";
import mongoose from "mongoose";
import { MODEL_CATALOG } from "./router";

export interface TraceParams {
  sessionId?: string;
  userId?: string;
  role: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  status: "success" | "failure";
  error?: string;
  taskType: string;
}

export async function logAiTrace(params: TraceParams) {
  try {
    const config = MODEL_CATALOG[params.model];
    const provider = config?.provider || "unknown";

    let costUSD = 0;
    if (config) {
      const inputCost = (params.promptTokens / 1000) * config.costPer1kInput;
      const outputCost = (params.completionTokens / 1000) * config.costPer1kOutput;
      costUSD = inputCost + outputCost;
    }

    const traceData = {
      sessionId: params.sessionId ? new mongoose.Types.ObjectId(params.sessionId) : undefined,
      userId: params.userId ? new mongoose.Types.ObjectId(params.userId) : undefined,
      role: params.role,
      provider,
      llmModel: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens: params.promptTokens + params.completionTokens,
      costUSD,
      latencyMs: params.latencyMs,
      status: params.status,
      error: params.error,
      taskType: params.taskType,
    };

    await AiTrace.create(traceData);
  } catch (error) {
    console.error("Failed to write AI trace logs to database:", error);
  }
}
