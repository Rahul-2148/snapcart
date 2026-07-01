export interface ProviderResponse {
  success: boolean;
  text: string;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  costUSD?: number;
  error?: string;
}

export interface StreamResponse {
  success: boolean;
  stream: AsyncIterable<string>;
  error?: string;
}

export interface Provider {
  name: string;
  generate(
    prompt: string,
    options?: { systemInstruction?: string; temperature?: number; preferredModel?: string; signal?: AbortSignal }
  ): Promise<ProviderResponse>;
  
  stream(
    prompt: string,
    options?: { systemInstruction?: string; temperature?: number; preferredModel?: string; signal?: AbortSignal }
  ): Promise<StreamResponse>;
  
  vision(
    imageBuffer: Buffer,
    prompt: string,
    options?: { preferredModel?: string; signal?: AbortSignal }
  ): Promise<ProviderResponse>;
  
  embeddings(
    text: string,
    options?: { preferredModel?: string; signal?: AbortSignal }
  ): Promise<number[]>;
  
  healthCheck(): Promise<boolean>;
}

// Cost mapping helper for different models (per 1k tokens)
export const MODEL_COSTS: Record<
  string,
  { inputCostPer1k: number; outputCostPer1k: number }
> = {
  // Gemini Models
  "gemini-1.5-flash": { inputCostPer1k: 0.000075, outputCostPer1k: 0.0003 },
  "gemini-2.0-flash": { inputCostPer1k: 0.000075, outputCostPer1k: 0.0003 },
  "gemini-2.5-flash": { inputCostPer1k: 0.000075, outputCostPer1k: 0.0003 },
  "gemini-3.5-flash": { inputCostPer1k: 0.000075, outputCostPer1k: 0.0003 },
  "gemini-3-flash-preview": { inputCostPer1k: 0.000075, outputCostPer1k: 0.0003 },
  "gemini-3.1-flash-lite": { inputCostPer1k: 0.00003, outputCostPer1k: 0.00015 },
  "gemini-1.5-pro": { inputCostPer1k: 0.00125, outputCostPer1k: 0.00375 },
  "gemini-2.0-pro": { inputCostPer1k: 0.00125, outputCostPer1k: 0.00375 },
  "gemini-2.5-pro": { inputCostPer1k: 0.00125, outputCostPer1k: 0.00375 },
  "gemini-pro-latest": { inputCostPer1k: 0.00125, outputCostPer1k: 0.00375 },
  "gemini-embedding-001": { inputCostPer1k: 0.00002, outputCostPer1k: 0 },

  // Groq Models
  "llama-3.3-70b-versatile": { inputCostPer1k: 0.00059, outputCostPer1k: 0.00079 },
  "mixtral-8x7b-32768": { inputCostPer1k: 0.00027, outputCostPer1k: 0.00027 },
  "gemma2-9b-it": { inputCostPer1k: 0.0002, outputCostPer1k: 0.0002 },

  // OpenRouter Models
  "meta-llama/llama-3.3-70b-instruct": { inputCostPer1k: 0.00012, outputCostPer1k: 0.0003 },
  "google/gemini-2.5-flash": { inputCostPer1k: 0.000075, outputCostPer1k: 0.0003 },

  // Default / Local Models
  "default": { inputCostPer1k: 0, outputCostPer1k: 0 }
};

export function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const cleanModel = model.replace(/^models\//, "");
  const cost = MODEL_COSTS[cleanModel] || MODEL_COSTS["default"];
  const inputCost = (promptTokens / 1000) * cost.inputCostPer1k;
  const outputCost = (completionTokens / 1000) * cost.outputCostPer1k;
  return inputCost + outputCost;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.8);
}
