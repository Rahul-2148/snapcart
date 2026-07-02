import { Provider, ProviderResponse, StreamResponse, calculateCost, estimateTokens } from "./base";

const getReferer = () => process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

export class OpenRouterProvider implements Provider {
  readonly name = "openrouter";
  private getApiKey(): string {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("OPENROUTER_API_KEY is not configured.");
    return key;
  }

  async generate(
    prompt: string,
    options?: { systemInstruction?: string; temperature?: number; preferredModel?: string; signal?: AbortSignal }
  ): Promise<ProviderResponse> {
    try {
      const apiKey = this.getApiKey();
      const model = options?.preferredModel || "meta-llama/llama-3.3-70b-instruct";

      const messages: any[] = [];
      if (options?.systemInstruction) {
        messages.push({ role: "system", content: options.systemInstruction });
      }
      messages.push({ role: "user", content: prompt });

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": getReferer(),
          "X-Title": "Snapcart",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.3,
        }),
        signal: options?.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, text: "", error: `OpenRouter error: ${res.status} ${errText}` };
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";
      const promptTokens = data?.usage?.prompt_tokens || estimateTokens(prompt + (options?.systemInstruction || ""));
      const completionTokens = data?.usage?.completion_tokens || estimateTokens(text);
      const totalTokens = promptTokens + completionTokens;

      return {
        success: true,
        text: text.trim(),
        tokensUsed: { promptTokens, completionTokens, totalTokens },
        costUSD: calculateCost(model, promptTokens, completionTokens),
      };
    } catch (err: any) {
      return { success: false, text: "", error: err.message };
    }
  }

  async stream(
    prompt: string,
    options?: { systemInstruction?: string; temperature?: number; preferredModel?: string; signal?: AbortSignal }
  ): Promise<StreamResponse> {
    try {
      const apiKey = this.getApiKey();
      const model = options?.preferredModel || "meta-llama/llama-3.3-70b-instruct";

      const messages: any[] = [];
      if (options?.systemInstruction) {
        messages.push({ role: "system", content: options.systemInstruction });
      }
      messages.push({ role: "user", content: prompt });

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": getReferer(),
          "X-Title": "Snapcart",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.3,
          stream: true,
        }),
        signal: options?.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, stream: null as any, error: `OpenRouter stream error: ${res.status} ${errText}` };
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const streamGenerator = async function* () {
        if (!reader) return;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // Leave the last element in buffer if it doesn't end with a newline
            buffer = lines.pop() || "";

            for (const line of lines) {
              const cleaned = line.trim();
              if (!cleaned.startsWith("data:")) continue;
              const jsonStr = cleaned.slice(5).trim();
              if (jsonStr === "[DONE]") continue;

              try {
                const jsonObj = JSON.parse(jsonStr);
                const text = jsonObj?.choices?.[0]?.delta?.content;
                if (text) yield text;
              } catch {
                // Ignore incomplete lines
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      };

      return { success: true, stream: streamGenerator() };
    } catch (err: any) {
      return { success: false, stream: null as any, error: err.message };
    }
  }

  async vision(
    imageBuffer: Buffer,
    prompt: string,
    options?: { preferredModel?: string; signal?: AbortSignal }
  ): Promise<ProviderResponse> {
    try {
      const apiKey = this.getApiKey();
      const model = options?.preferredModel || "google/gemini-2.5-flash"; // Default vision capable model on OpenRouter

      const base64Image = imageBuffer.toString("base64");
      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ];

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": getReferer(),
          "X-Title": "Snapcart",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
        }),
        signal: options?.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, text: "", error: `OpenRouter vision error: ${res.status} ${errText}` };
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";
      const promptTokens = data?.usage?.prompt_tokens || estimateTokens(prompt) + 300;
      const completionTokens = data?.usage?.completion_tokens || estimateTokens(text);
      const totalTokens = promptTokens + completionTokens;

      return {
        success: true,
        text: text.trim(),
        tokensUsed: { promptTokens, completionTokens, totalTokens },
        costUSD: calculateCost(model, promptTokens, completionTokens),
      };
    } catch (err: any) {
      return { success: false, text: "", error: err.message };
    }
  }

  async embeddings(
    text: string,
    options?: { preferredModel?: string; signal?: AbortSignal }
  ): Promise<number[]> {
    try {
      const apiKey = this.getApiKey();
      const model = options?.preferredModel || "openai/text-embedding-3-small";

      const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: text,
        }),
        signal: options?.signal,
      });

      if (!res.ok) {
        throw new Error(`OpenRouter embeddings error status ${res.status}`);
      }

      const data = await res.json();
      const embedding = data?.data?.[0]?.embedding;
      if (Array.isArray(embedding)) {
        return embedding;
      }
      throw new Error("No embedding values in response.");
    } catch (err: any) {
      console.error("OpenRouter embeddings failed:", err);
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) return false;
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 2,
        }),
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }
}
