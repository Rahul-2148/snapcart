// src/app/api/admin/add-grocery/description/route.ts
import { NextResponse } from "next/server";

// Generate with Gemini
async function generateWithGemini(prompt: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const json = await response.json();
  const result = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  
  if (!result) {
    throw new Error("No content in Gemini response");
  }
  
  return result;
}

// Fallback: Generate with Groq
async function generateWithGroq(prompt: string) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const models = [
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
  ];

  for (const model of models) {
    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
        }
      );

      if (!response.ok) {
        continue; // Try next model without reading body
      }

      const json = await response.json();
      return json?.choices?.[0]?.message?.content?.trim();
    } catch (error) {
      continue; // Try next model
    }
  }

  throw new Error("All Groq models unavailable");
}

export async function POST(req: Request) {
  try {
    const { name, category } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "Name is required" },
        { status: 400 }
      );
    }

    const prompt = category
      ? `Write a short, appealing grocery product description for "${name}" related to the "${category}" category (max 3 lines, no emojis).`
      : `Write a short, appealing grocery product description for "${name}" (max 3 lines, no emojis).`;

    let generatedText: string | undefined;
    let usedProvider = "Gemini";

    // Try Gemini first
    try {
      generatedText = await generateWithGemini(prompt);
    } catch (geminiError: any) {
      console.warn("Gemini failed, trying Groq fallback:", geminiError.message);

      // Fallback to Groq
      try {
        generatedText = await generateWithGroq(prompt);
        usedProvider = "Groq";
      } catch (groqError: any) {
        console.error("Groq also failed:", groqError.message);
        throw new Error(
          `Both Gemini and Groq failed: ${geminiError.message}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      description: generatedText || "Not able to generate description",
      provider: usedProvider,
      message: `Description generated successfully using ${usedProvider}`,
    });
  } catch (error: any) {
    console.error("AI Description Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to generate description: ${error.message}`,
      },
      { status: 500 }
    );
  }
}
