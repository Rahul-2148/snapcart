import { redis } from "../redis";
import { SemanticCache } from "@/models/semanticCache.model";

// In-memory cache fallback when Upstash Redis is not configured or offline
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export async function getDirectCache(key: string): Promise<string | null> {
  try {
    const cached = await redis.get(key);
    if (cached) return String(cached);
  } catch (err) {
    // Fall back to in-memory cache
    const item = memoryCache.get(key);
    if (item) {
      if (Date.now() < item.expiresAt) {
        return item.value;
      }
      memoryCache.delete(key);
    }
  }
  return null;
}

export async function setDirectCache(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, value);
  } catch (err) {
    // Fall back to in-memory cache
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

// Memory cleaner for expired memoryCache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (now >= item.expiresAt) {
      memoryCache.delete(key);
    }
  }
}, 60000); // run every minute

/* ================= SEMANTIC CACHE ================= */

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface SemanticCacheHit {
  reply: string;
  model: string;
  similarity: number;
}

export async function getSemanticCache(
  queryEmbedding: number[],
  systemInstruction?: string,
  threshold: number = 0.92
): Promise<SemanticCacheHit | null> {
  if (!queryEmbedding || queryEmbedding.length === 0) return null;

  try {
    // Fetch the recent 150 semantic cache entries
    const recentCached = await SemanticCache.find({})
      .sort({ createdAt: -1 })
      .limit(150)
      .lean();

    let bestMatch: any = null;
    let maxSimilarity = -1;

    for (const cached of recentCached) {
      // Skip if system instructions differ significantly
      if ((cached.systemInstruction || "") !== (systemInstruction || "")) {
        continue;
      }

      const similarity = cosineSimilarity(queryEmbedding, cached.embedding);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestMatch = cached;
      }
    }

    if (bestMatch && maxSimilarity >= threshold) {
      console.log(`[Semantic Cache HIT] Match found with similarity score: ${maxSimilarity.toFixed(4)}`);
      return {
        reply: bestMatch.reply,
        model: bestMatch.llmModel,
        similarity: maxSimilarity,
      };
    }
  } catch (error) {
    console.error("Failed to query semantic cache:", error);
  }

  return null;
}

export async function setSemanticCache(
  prompt: string,
  systemInstruction: string | undefined,
  reply: string,
  model: string,
  embedding: number[]
): Promise<void> {
  if (!embedding || embedding.length === 0) return;

  try {
    await SemanticCache.create({
      prompt,
      systemInstruction,
      reply,
      llmModel: model,
      embedding,
    });
  } catch (error) {
    console.error("Failed to save to semantic cache:", error);
  }
}
