import { Provider, ProviderResponse, StreamResponse, estimateTokens } from "./base";

export class SelfHostedProvider implements Provider {
  readonly name = "selfhosted";

  private getUrl(): string {
    return process.env.SELF_HOSTED_URL || "http://127.0.0.1:11434/v1";
  }

  private getModel(): string {
    return process.env.SELF_HOSTED_MODEL || "llama3";
  }

  async generate(
    prompt: string,
    options?: { systemInstruction?: string; temperature?: number; preferredModel?: string; signal?: AbortSignal }
  ): Promise<ProviderResponse> {
    try {
      const baseUrl = this.getUrl();
      const model = options?.preferredModel || this.getModel();

      const messages: any[] = [];
      if (options?.systemInstruction) {
        messages.push({ role: "system", content: options.systemInstruction });
      }
      messages.push({ role: "user", content: prompt });

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.3,
        }),
        signal: options?.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, text: "", error: `SelfHosted error: ${res.status} ${errText}` };
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
        costUSD: 0, // Local self-hosted models have zero API cost!
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
      const baseUrl = this.getUrl();
      const model = options?.preferredModel || this.getModel();

      const messages: any[] = [];
      if (options?.systemInstruction) {
        messages.push({ role: "system", content: options.systemInstruction });
      }
      messages.push({ role: "user", content: prompt });

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        return { success: false, stream: null as any, error: `SelfHosted stream error: ${res.status} ${errText}` };
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
      const baseUrl = this.getUrl();
      const model = options?.preferredModel || this.getModel();

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

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
        }),
        signal: options?.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, text: "", error: `SelfHosted vision error: ${res.status} ${errText}` };
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
        costUSD: 0,
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
      const baseUrl = this.getUrl();
      const model = options?.preferredModel || "nomic-embed-text";

      const res = await fetch(`${baseUrl}/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          input: text,
        }),
        signal: options?.signal,
      });

      if (!res.ok) {
        throw new Error(`SelfHosted embeddings error status ${res.status}`);
      }

      const data = await res.json();
      const embedding = data?.data?.[0]?.embedding || data?.embedding;
      if (Array.isArray(embedding)) {
        return embedding;
      }
      throw new Error("No embedding values in response.");
    } catch (err: any) {
      console.error("SelfHosted embeddings failed:", err);
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const baseUrl = this.getUrl();
      // Most local APIs like Ollama expose a simple base endpoint health check,
      // or we can test completions with low token limit
      const res = await fetch(`${baseUrl}/tags`);
      if (res.status === 200) return true;

      // Fallback completions ping
      const compRes = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.getModel(),
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
      });
      return compRes.status === 200;
    } catch {
      return false;
    }
  }
}
