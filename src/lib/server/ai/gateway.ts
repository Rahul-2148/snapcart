import { runInputGuardrails, runOutputGuardrails } from "./guardrails";
import { logAiTrace } from "./observability";
import { routeModel, TaskType, MODEL_CATALOG } from "./router";
import { Provider, ProviderResponse } from "./providers/base";
import { GeminiProvider } from "./providers/gemini";
import { OpenRouterProvider } from "./providers/openrouter";
import { GroqProvider } from "./providers/groq";
import { SelfHostedProvider } from "./providers/selfhosted";
import { getDirectCache, setDirectCache, getSemanticCache, setSemanticCache } from "./cache";

export interface GatewayCallParams {
  userId?: string;
  sessionId?: string;
  role: string;
  prompt: string;
  systemInstruction?: string;
  taskType: TaskType;
  temperature?: number;
  preferredModel?: string;
}

export interface GatewayResponse {
  success: boolean;
  reply: string;
  model: string;
  error?: string;
}

// Instantiate providers
const providers: Record<string, Provider> = {
  gemini: new GeminiProvider(),
  openrouter: new OpenRouterProvider(),
  groq: new GroqProvider(),
  selfhosted: new SelfHostedProvider(),
};

// Circuit Breakers
class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF-OPEN" = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;
  private cooldownMs = 30000; // 30 seconds

  constructor(public providerName: string) {}

  allow(): boolean {
    if (this.state === "CLOSED") return true;
    if (this.state === "OPEN") {
      const now = Date.now();
      if (now - this.lastFailureTime > this.cooldownMs) {
        this.state = "HALF-OPEN";
        console.log(`[Circuit Breaker] ${this.providerName} transitioning to HALF-OPEN`);
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess() {
    this.state = "CLOSED";
    this.failureCount = 0;
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    console.warn(`[Circuit Breaker] ${this.providerName} failure count: ${this.failureCount}`);
    if (this.failureCount >= 3) {
      this.state = "OPEN";
      console.error(`[Circuit Breaker] ${this.providerName} TRIPPED (OPEN)`);
    }
  }
}

const circuitBreakers: Record<string, CircuitBreaker> = {
  gemini: new CircuitBreaker("gemini"),
  openrouter: new CircuitBreaker("openrouter"),
  groq: new CircuitBreaker("groq"),
  selfhosted: new CircuitBreaker("selfhosted"),
};

// Concurrency Queue to prevent free-tier API rate limits
class RequestQueue {
  private activeCount = 0;
  private queue: (() => void)[] = [];
  constructor(private maxConcurrency: number = 5) {}

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

const gatewayQueue = new RequestQueue(5);

// Health Monitoring Stats
export const providerStats = {
  gemini: { calls: 0, successes: 0, failures: 0, lastCheckTime: 0, healthy: true },
  openrouter: { calls: 0, successes: 0, failures: 0, lastCheckTime: 0, healthy: true },
  groq: { calls: 0, successes: 0, failures: 0, lastCheckTime: 0, healthy: true },
  selfhosted: { calls: 0, successes: 0, failures: 0, lastCheckTime: 0, healthy: true },
};

// Background Health Checker runs every 2 minutes
if (typeof window === "undefined") {
  setInterval(async () => {
    for (const name of Object.keys(providers)) {
      const provider = providers[name];
      try {
        const ok = await provider.healthCheck();
        providerStats[name as keyof typeof providerStats].healthy = ok;
        providerStats[name as keyof typeof providerStats].lastCheckTime = Date.now();
      } catch {
        providerStats[name as keyof typeof providerStats].healthy = false;
      }
    }
  }, 120000);
}

// Generate unified embeddings with automatic failover
export async function getGatewayEmbeddings(text: string): Promise<number[]> {
  const priorityOrder = ["gemini", "openrouter", "selfhosted"];
  for (const providerName of priorityOrder) {
    const provider = providers[providerName];
    const breaker = circuitBreakers[providerName];

    if (!breaker.allow()) continue;

    try {
      // Determine default model name for embeddings per provider
      const model = providerName === "gemini" 
        ? "gemini-embedding-001" 
        : providerName === "openrouter" 
        ? "openai/text-embedding-3-small"
        : "nomic-embed-text";

      const embedding = await provider.embeddings(text, { preferredModel: model });
      if (embedding && embedding.length > 0) {
        breaker.recordSuccess();
        return embedding;
      }
    } catch (err) {
      breaker.recordFailure();
    }
  }
  return [];
}

// Main Gateway Caller with Cache, Backoff Retries, Failover, Circuit Breaker, Queue
export async function callAiGateway(params: GatewayCallParams): Promise<GatewayResponse> {
  const startTime = Date.now();

  // 1. Run Input Guardrails
  const inputCheck = runInputGuardrails(params.prompt);
  if (!inputCheck.isSafe) {
    return {
      success: false,
      reply: inputCheck.reason || "Safety block triggered.",
      model: "guardrails",
      error: "Input safety violation.",
    };
  }

  const promptContent = inputCheck.sanitizedContent || params.prompt;
  const cacheKey = `ai:direct:${Buffer.from(promptContent + (params.systemInstruction || "")).toString("base64").slice(0, 80)}`;

  // 2. Direct Cache Lookup
  const directCached = await getDirectCache(cacheKey);
  if (directCached) {
    console.log("[Direct Cache HIT] Returning cached answer");
    return { success: true, reply: directCached, model: "cached-direct" };
  }

  // 3. Semantic Cache Lookup
  const queryEmbedding = await getGatewayEmbeddings(promptContent);
  if (queryEmbedding && queryEmbedding.length > 0) {
    const semanticHit = await getSemanticCache(queryEmbedding, params.systemInstruction);
    if (semanticHit) {
      return { success: true, reply: semanticHit.reply, model: `cached-semantic (${semanticHit.model})` };
    }
  }

  // 4. Provider Routing & Failover
  // We prioritize: Gemini -> OpenRouter -> Groq -> SelfHosted
  const defaultRoutingOrder = ["gemini", "openrouter", "groq", "selfhosted"];
  let lastError: Error | null = null;
  let finalReply = "";
  let finalModel = "unknown";
  let promptTokens = 0;
  let completionTokens = 0;

  for (const providerName of defaultRoutingOrder) {
    const provider = providers[providerName];
    const breaker = circuitBreakers[providerName];

    // Check Circuit Breaker
    if (!breaker.allow()) {
      console.log(`[Circuit Breaker] Skipping provider ${providerName} (OPEN)`);
      continue;
    }

    const stats = providerStats[providerName as keyof typeof providerStats];
    stats.calls++;

    // Execute through Concurrency Queue
    const response: ProviderResponse = await gatewayQueue.enqueue(async () => {
      let attempts = 0;
      const maxAttempts = 3;
      let backoffDelay = 600;

      while (attempts < maxAttempts) {
        attempts++;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout per attempt

        try {
          // Resolve provider model names
          let preferredModel = params.preferredModel;
          if (preferredModel) {
            if (providerName === "gemini" && !preferredModel.includes("gemini")) {
              preferredModel = undefined;
            } else if (providerName === "openrouter" && preferredModel.startsWith("gemini")) {
              preferredModel = "google/" + preferredModel;
            } else if (providerName === "groq" && preferredModel.includes("gemini")) {
              preferredModel = undefined;
            } else if (providerName === "selfhosted" && preferredModel.includes("gemini")) {
              preferredModel = undefined;
            }
          }
          if (!preferredModel) {
            if (providerName === "gemini") preferredModel = "gemini-1.5-flash";
            else if (providerName === "openrouter") preferredModel = "meta-llama/llama-3.3-70b-instruct";
            else if (providerName === "groq") preferredModel = "llama-3.3-70b-versatile";
            else preferredModel = "llama3";
          }

          const res = await provider.generate(promptContent, {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature,
            preferredModel,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (res.success) {
            return res;
          }

          // Inspect errors for retrying
          const isRetryableStatus = 
            res.error?.includes("429") || 
            res.error?.includes("500") || 
            res.error?.includes("502") || 
            res.error?.includes("503") || 
            res.error?.includes("504") || 
            res.error?.includes("Timeout") ||
            res.error?.includes("aborted");

          if (isRetryableStatus && attempts < maxAttempts) {
            console.warn(`[Gateway Failover Retry] Provider ${providerName} failed with retryable error (attempt ${attempts}): ${res.error}. Retrying in ${backoffDelay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
            backoffDelay *= 2; // exponential backoff
            continue;
          }

          throw new Error(res.error || "Generation returned success=false");
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (attempts < maxAttempts && (err.name === "AbortError" || err.message?.includes("aborted"))) {
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
            backoffDelay *= 2;
            continue;
          }
          throw err;
        }
      }

      throw new Error(`Max retry attempts exhausted for provider ${providerName}`);
    }).catch((err) => {
      return { success: false, text: "", error: err.message };
    });

    if (response.success) {
      breaker.recordSuccess();
      stats.successes++;
      finalReply = response.text;
      finalModel = `${providerName}/${params.preferredModel || "default"}`;
      promptTokens = response.tokensUsed?.promptTokens || 0;
      completionTokens = response.tokensUsed?.completionTokens || 0;
      break;
    } else {
      breaker.recordFailure();
      stats.failures++;
      lastError = new Error(response.error || `All attempts on provider ${providerName} failed`);
      console.error(`[Gateway Failover] Provider ${providerName} failed:`, response.error);
    }
  }

  if (!finalReply) {
    // If all providers failed, write trace log and return friendly generic error
    const latencyMs = Date.now() - startTime;
    logAiTrace({
      sessionId: params.sessionId,
      userId: params.userId,
      role: params.role,
      model: finalModel,
      promptTokens: 0,
      completionTokens: 0,
      latencyMs,
      status: "failure",
      error: lastError?.message || "All providers exhausted",
      taskType: params.taskType,
    });

    return {
      success: false,
      reply: "We are currently experiencing issues coordinating the AI service. Please try again shortly.",
      model: "failover-exhausted",
      error: lastError?.message,
    };
  }

  // 5. Run Output Guardrails
  const outputCheck = runOutputGuardrails(finalReply);
  const sanitizedReply = outputCheck.sanitizedContent || finalReply;
  const latencyMs = Date.now() - startTime;

  // 6. Write caches asynchronously
  setDirectCache(cacheKey, sanitizedReply, 3600);
  if (queryEmbedding && queryEmbedding.length > 0) {
    setSemanticCache(promptContent, params.systemInstruction, sanitizedReply, finalModel, queryEmbedding);
  }

  // 7. Write Telemetry trace
  logAiTrace({
    sessionId: params.sessionId,
    userId: params.userId,
    role: params.role,
    model: finalModel,
    promptTokens,
    completionTokens,
    latencyMs,
    status: "success",
    taskType: params.taskType,
  });

  return {
    success: true,
    reply: sanitizedReply,
    model: finalModel,
  };
}

// Streaming wrapper with failover
export async function* streamAiGateway(params: GatewayCallParams): AsyncIterable<string> {
  const inputCheck = runInputGuardrails(params.prompt);
  if (!inputCheck.isSafe) {
    yield inputCheck.reason || "Safety block triggered.";
    return;
  }

  const promptContent = inputCheck.sanitizedContent || params.prompt;
  const defaultRoutingOrder = ["gemini", "openrouter", "groq", "selfhosted"];

  for (const providerName of defaultRoutingOrder) {
    const provider = providers[providerName];
    const breaker = circuitBreakers[providerName];

    if (!breaker.allow()) continue;

    try {
      let preferredModel = params.preferredModel;
      if (preferredModel) {
        if (providerName === "gemini" && !preferredModel.includes("gemini")) {
          preferredModel = undefined;
        } else if (providerName === "openrouter" && preferredModel.startsWith("gemini")) {
          preferredModel = "google/" + preferredModel;
        } else if (providerName === "groq" && preferredModel.includes("gemini")) {
          preferredModel = undefined;
        } else if (providerName === "selfhosted" && preferredModel.includes("gemini")) {
          preferredModel = undefined;
        }
      }
      if (!preferredModel) {
        if (providerName === "gemini") preferredModel = "gemini-1.5-flash";
        else if (providerName === "openrouter") preferredModel = "meta-llama/llama-3.3-70b-instruct";
        else if (providerName === "groq") preferredModel = "llama-3.3-70b-versatile";
        else preferredModel = "llama3";
      }

      const res = await provider.stream(promptContent, {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature,
        preferredModel,
      });

      if (res.success && res.stream) {
        breaker.recordSuccess();
        for await (const chunk of res.stream) {
          yield chunk;
        }
        return;
      }
      throw new Error(res.error || "Streaming failed");
    } catch (err) {
      breaker.recordFailure();
      console.error(`[Gateway Stream Failover] Provider ${providerName} streaming error:`, err);
    }
  }

  yield "We are currently experiencing issues coordinating the AI service. Please try again shortly.";
}
