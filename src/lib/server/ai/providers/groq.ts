import { Provider, ProviderResponse, StreamResponse, calculateCost, estimateTokens } from "./base";

export class GroqProvider implements Provider {
  readonly name = "groq";
  private getApiKey(): string {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY is not configured.");
    return key;
  }

  async generate(
    prompt: string,
    options?: { systemInstruction?: string; temperature?: number; preferredModel?: string; signal?: AbortSignal }
  ): Promise<ProviderResponse> {
    try {
      const apiKey = this.getApiKey();
      const model = options?.preferredModel || "llama-3.3-70b-versatile";

      const messages: any[] = [];
      if (options?.systemInstruction) {
        messages.push({ role: "system", content: options.systemInstruction });
      }
      messages.push({ role: "user", content: prompt });

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
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
        return { success: false, text: "", error: `Groq error: ${res.status} ${errText}` };
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
      const model = options?.preferredModel || "llama-3.3-70b-versatile";

      const messages: any[] = [];
      if (options?.systemInstruction) {
        messages.push({ role: "system", content: options.systemInstruction });
      }
      messages.push({ role: "user", content: prompt });

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
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
        return { success: false, stream: null as any, error: `Groq stream error: ${res.status} ${errText}` };
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
      const model = options?.preferredModel || "llama-3.2-11b-vision-preview";

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

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
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
        return { success: false, text: "", error: `Groq vision error: ${res.status} ${errText}` };
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
    // Groq currently has limited support for embeddings. We fallback to an empty array so
    // the AI Gateway knows to fall back to the next available provider (Gemini).
    console.warn("Groq embeddings not natively supported. Returning empty array for fallback.");
    return [];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return false;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
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
