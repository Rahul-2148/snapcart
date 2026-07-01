export interface ModelConfig {
  provider: "gemini" | "openai" | "anthropic" | "openrouter" | "groq" | "selfhosted";
  model: string;
  costPer1kInput: number;   // in USD
  costPer1kOutput: number;  // in USD
  maxTokens: number;
}

export type TaskType = "chat" | "rag" | "agent_orchestration" | "vision" | "summary";

export const MODEL_CATALOG: Record<string, ModelConfig> = {
  "gemini-flash-latest": {
    provider: "gemini",
    model: "gemini-1.5-flash",
    costPer1kInput: 0.000075,
    costPer1kOutput: 0.0003,
    maxTokens: 8192,
  },
  "gemini-pro-latest": {
    provider: "gemini",
    model: "gemini-1.5-pro",
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.00375,
    maxTokens: 8192,
  },
  "openrouter-llama-3": {
    provider: "openrouter",
    model: "meta-llama/llama-3.3-70b-instruct",
    costPer1kInput: 0.00012,
    costPer1kOutput: 0.0003,
    maxTokens: 4096,
  },
  "groq-llama-3": {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    costPer1kInput: 0.00059,
    costPer1kOutput: 0.00079,
    maxTokens: 4096,
  },
  "selfhosted-llama": {
    provider: "selfhosted",
    model: "llama3",
    costPer1kInput: 0,
    costPer1kOutput: 0,
    maxTokens: 4096,
  },
  "gpt-4o-mini": {
    provider: "openai",
    model: "gpt-4o-mini",
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    maxTokens: 4096,
  },
  "gpt-4o": {
    provider: "openai",
    model: "gpt-4o",
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    maxTokens: 4096,
  },
};

export function routeModel(task: TaskType, priority: "cost" | "latency" | "quality" = "quality"): ModelConfig {
  // Map tasks to model configurations
  if (task === "chat" || task === "agent_orchestration") {
    return MODEL_CATALOG["gemini-flash-latest"];
  }
  if (task === "vision") {
    return MODEL_CATALOG["gemini-flash-latest"];
  }
  return MODEL_CATALOG["gemini-flash-latest"];
}
