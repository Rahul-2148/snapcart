import { Provider, ProviderResponse, StreamResponse, calculateCost, estimateTokens } from "./base";

export class GeminiProvider implements Provider {
  readonly name = "gemini";
  private getApiKey(): string {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured.");
    return key;
  }

  async generate(
    prompt: string,
    options?: { systemInstruction?: string; temperature?: number; preferredModel?: string; signal?: AbortSignal }
  ): Promise<ProviderResponse> {
    try {
      const apiKey = this.getApiKey();
      const model = options?.preferredModel || "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const requestBody: any = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.3,
        },
      };

      if (options?.systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: options.systemInstruction }],
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: options?.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          text: "",
          error: `Gemini generate API error: ${res.status} ${errText}`,
        };
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // Parse token counts from Gemini response metadata
      const promptTokens = data?.usageMetadata?.promptTokenCount || estimateTokens(prompt + (options?.systemInstruction || ""));
      const completionTokens = data?.usageMetadata?.candidatesTokenCount || estimateTokens(text);
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
      const model = options?.preferredModel || "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;

      const requestBody: any = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.3,
        },
      };

      if (options?.systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: options.systemInstruction }],
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: options?.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, stream: null as any, error: `Gemini stream error: ${res.status} ${errText}` };
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
            
            // Gemini stream returns a JSON array over HTTP chunked transfer coding:
            // e.g. ",\n{\n  \"candidates\": ...\n}"
            // A simple regex approach or JSON-splitting parser works.
            // Let's implement a bracket parser to slice complete JSON objects out of the buffer.
            let braceCount = 0;
            let startIdx = -1;
            let inString = false;
            let i = 0;

            while (i < buffer.length) {
              const char = buffer[i];

              if (char === '"' && buffer[i - 1] !== '\\') {
                inString = !inString;
              }

              if (!inString) {
                if (char === '{') {
                  if (braceCount === 0) startIdx = i;
                  braceCount++;
                } else if (char === '}') {
                  braceCount--;
                  if (braceCount === 0 && startIdx !== -1) {
                    const jsonStr = buffer.slice(startIdx, i + 1);
                    try {
                      const jsonObj = JSON.parse(jsonStr);
                      const chunkText = jsonObj?.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (chunkText) {
                        yield chunkText;
                      }
                    } catch (e) {
                      // Silently skip partial/malformed chunk parsing
                    }
                    buffer = buffer.slice(i + 1);
                    i = -1; // reset index to 0 for sliced buffer
                    startIdx = -1;
                  }
                }
              }
              i++;
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
      const model = options?.preferredModel || "gemini-1.5-flash"; // Flash supports multimodal
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageBuffer.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: options?.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, text: "", error: `Gemini vision error: ${res.status} ${errText}` };
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const promptTokens = data?.usageMetadata?.promptTokenCount || estimateTokens(prompt) + 258; // approx token overhead for images
      const completionTokens = data?.usageMetadata?.candidatesTokenCount || estimateTokens(text);
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
      const model = options?.preferredModel || "gemini-embedding-001";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${model}`,
          content: {
            parts: [{ text }],
          },
        }),
        signal: options?.signal,
      });

      if (!res.ok) {
        throw new Error(`Gemini embeddings status ${res.status}`);
      }

      const data = await res.json();
      const embedding = data?.embedding?.values;
      if (Array.isArray(embedding)) {
        return embedding;
      }
      throw new Error("No embedding values in response.");
    } catch (err: any) {
      console.error("Gemini embeddings failed:", err);
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return false;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 2 },
          }),
        }
      );
      return res.status === 200;
    } catch {
      return false;
    }
  }
}
