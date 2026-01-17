// src/app/api/admin/add-grocery/description/route.ts
import { NextResponse } from "next/server";

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

    const generatedText =
      json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Not able to generate description";

    return NextResponse.json({
      success: true,
      description: generatedText,
      message: "Description generated successfully",
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
