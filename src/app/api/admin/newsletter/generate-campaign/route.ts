// src/app/api/admin/newsletter/generate-campaign/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildAppUrl, getAppBaseUrl } from "@/lib/config/urls";

// Generate campaign with Gemini
// Priority: Pro first, then Flash, then older models; configurable via GEMINI_MODELS (comma-separated)
async function generateWithGemini(
  prompt: string,
): Promise<{ text: string | null; modelUsed: string }> {
  const configured = process.env.GEMINI_MODELS;
  const models = configured
    ? configured
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean)
    : [
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.0-pro",
        "gemini-2.0-flash",
        "gemini-1.5-pro-latest",
        "gemini-1.5-flash-latest",
      ];

  let quotaExceeded = false;
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
        },
      );

      if (!response.ok) {
        // Attempt to parse JSON error; fallback to text
        let errorBody: any = null;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = { error: { message: await response.text() } };
        }

        if (response.status === 429 || errorBody?.error?.code === 429) {
          quotaExceeded = true;
          continue; // try next model (Flash)
        }

        lastError = new Error(
          `Gemini API error (${model}): ${response.status} ${errorBody?.error?.message || ""}`,
        );
        continue; // try next model
      }

      const json = await response.json();
      const text =
        json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
      if (text) return { text, modelUsed: model };

      lastError = new Error(`Gemini API returned no text for model ${model}`);
      continue;
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  if (quotaExceeded) {
    throw new Error("QUOTA_EXCEEDED");
  }
  if (lastError) throw lastError;
  throw new Error("Gemini API error: all models failed");
}

// Fallback: Generate campaign with Groq (tries multiple models)
async function generateWithGroq(prompt: string) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not configured");
  }

  // Try models in order - some may be decommissioned or unavailable
  const models = [
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
    "llama2-70b-4096",
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
            max_tokens: 2048,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        continue; // Try next model
      }

      const json = await response.json();
      return json?.choices?.[0]?.message?.content?.trim();
    } catch (error) {
      continue; // Try next model
    }
  }

  // All Groq models failed, throw error
  throw new Error(
    "All Groq models unavailable - check GROQ_API_KEY and account access",
  );
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const { campaignType, topic, keywords, tone, audience } = await req.json();

    if (!topic?.trim()) {
      return NextResponse.json(
        { success: false, message: "Topic is required" },
        { status: 400 },
      );
    }

    const appBaseUrl = getAppBaseUrl();
    const productsUrl = buildAppUrl("/user/products");
    const cartUrl = buildAppUrl("/user/cart");
    const checkoutUrl = buildAppUrl("/user/checkout");
    const profileUrl = buildAppUrl("/user/account/profile");
    const ordersUrl = buildAppUrl("/user/orders");
    const contactUrl = buildAppUrl("/contact");

    const prompt = `You are an expert email marketing specialist for Snapcart, a premium grocery delivery platform.

Generate a professional, beautifully formatted HTML email campaign BODY CONTENT ONLY with the following details:
- Campaign Type: ${campaignType || "General Newsletter"}
- Topic: ${topic}
- Keywords: ${keywords || "not specified"}
- Tone: ${tone || "professional"}
- Target Audience: ${audience || "grocery customers"}

RETURN FORMAT - Valid JSON (string values must escape newlines):
{"subject": "SUBJECT_LINE (max 60 chars)", "preview": "PREVIEW_TEXT (max 100 chars)", "htmlContent": "BODY_HTML_HERE"}

CRITICAL - DO NOT IGNORE:
1. Return ONLY the JSON object with NO markdown code blocks or backticks
2. The htmlContent must be a JSON STRING (use double quotes, not template literals)
3. Escape all newlines in HTML as \\n (two characters: backslash + n)
4. Format the HTML mentally with proper indentation, then escape newlines for JSON
5. Do NOT include <html>, <head>, <body>, or <DOCTYPE> tags
6. Generate BODY CONTENT ONLY - will be wrapped by system
7. Include {{userName}} placeholder for personalization

EXAMPLE OF CORRECT FORMAT:
{"subject": "Test", "preview": "Preview text", "htmlContent": "<div>\\n  <p>Hello</p>\\n</div>"}

DO NOT USE BACKTICKS OR TEMPLATE LITERALS - ONLY VALID JSON WITH ESCAPED NEWLINES

BODY CONTENT REQUIREMENTS (make it feel like Blinkit/Instamart quality):
1) Hero block (with green gradient header already included here): bold headline + 1 short subheading line.
2) Greeting: "Hi {{userName}}," followed by a warm intro (2-3 sentences) about freshness/convenience/savings.
3) Offer card: a bordered box with a standout offer line (e.g., "Flat 30% Off"), a 1-2 sentence teaser, and a primary CTA button.
4) Benefits list: 3 bullet/row items with emojis, each 1-2 lines (e.g., 🥬 Farm-fresh daily | ⏱️ 10-minute delivery | 💳 COD available).
5) Product highlights mini-grid: 4 quick highlights (name + one-liner) in two columns using simple inline styles (no images).
6) Secondary CTA + reassurance: a short line about easy returns/secure payments + another CTA link.
7) Style: Use #16a34a for primary, #1f2937 for text, light grays for backgrounds; font: Arial/Helvetica; good padding and spacing; inline CSS only; no images.
8) DO NOT include any footer/copyright/unsubscribe — the system adds it.

Valid URLs only:
- ${appBaseUrl}
- ${productsUrl}
- ${cartUrl}
- ${checkoutUrl}
- ${profileUrl}
- ${ordersUrl}
- ${contactUrl}

EXAMPLE BODY STRUCTURE (keep sections distinct; no images):
<div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 20px; text-align: center;">
  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">Snapcart</h1>
  <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Fresh Groceries at Your Doorstep</p>
</div>
<div style="padding: 30px; color: #1f2937;">
  <p>Hi {{userName}},</p>
  <p>[2-3 sentence intro about freshness/speed/savings]</p>
  <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0; background: #f9fafb;">
    <h2 style="margin: 0 0 8px 0; color: #15803d; font-size: 18px;">[Offer line e.g., Flat 30% Off]</h2>
    <p style="margin: 0 0 12px 0; color: #374151;">[1-2 sentence teaser]</p>
    <a href="${productsUrl}" style="display: inline-block; padding: 12px 18px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Shop Now</a>
  </div>
  <ul style="padding-left: 18px; margin: 0 0 16px 0;">
    <li style="margin-bottom: 6px;">🥬 [Benefit 1, 1-2 lines]</li>
    <li style="margin-bottom: 6px;">⏱️ [Benefit 2, 1-2 lines]</li>
    <li style="margin-bottom: 6px;">💳 [Benefit 3, 1-2 lines]</li>
  </ul>
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 16px 0;">
    <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff;">
      <p style="margin: 0; font-weight: 600;">[Item 1]</p>
      <p style="margin: 4px 0 0 0; color: #374151; font-size: 13px;">[One-liner]</p>
    </div>
    <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff;">
      <p style="margin: 0; font-weight: 600;">[Item 2]</p>
      <p style="margin: 4px 0 0 0; color: #374151; font-size: 13px;">[One-liner]</p>
    </div>
    <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff;">
      <p style="margin: 0; font-weight: 600;">[Item 3]</p>
      <p style="margin: 4px 0 0 0; color: #374151; font-size: 13px;">[One-liner]</p>
    </div>
    <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff;">
      <p style="margin: 0; font-weight: 600;">[Item 4]</p>
      <p style="margin: 4px 0 0 0; color: #374151; font-size: 13px;">[One-liner]</p>
    </div>
  </div>
  <p style="margin: 0 0 12px 0; color: #374151;">[Reassurance about returns/secure payments]</p>
  <a href="${cartUrl}" style="display: inline-block; padding: 11px 16px; background: #15803d; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Checkout Fast</a>
</div>
NOTE: No footer/copyright/unsubscribe — system adds footer automatically`;

    let generatedText: string | null = null;
    let usedProvider = "Gemini";

    try {
      // Try Gemini first (Pro → Flash)
      const gemini = await generateWithGemini(prompt);
      generatedText = gemini.text;
      usedProvider = `Gemini (${gemini.modelUsed})`;
    } catch (error: any) {
      if (error.message === "QUOTA_EXCEEDED") {
        try {
          generatedText = await generateWithGroq(prompt);
          usedProvider = "Groq";
        } catch (error: any) {
          throw error;
        }
      } else {
        throw error;
      }
    }

    if (!generatedText) {
      return NextResponse.json(
        { success: false, message: "Failed to generate campaign" },
        { status: 500 },
      );
    }

    // Remove markdown code blocks if present
    let cleanedText = generatedText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Fix unescaped newlines in JSON strings
    // This regex finds string values and escapes internal newlines
    cleanedText = cleanedText.replace(/"([^"]*)":/g, (match, key) => {
      return `"${key}":`;
    });

    // More aggressive: find the JSON object and fix all unescaped newlines in strings
    const jsonStart = cleanedText.indexOf("{");
    const jsonEnd = cleanedText.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      let jsonStr = cleanedText.substring(jsonStart, jsonEnd + 1);

      // Replace unescaped newlines within string values
      // This is a bit tricky - we need to escape newlines that are inside quoted strings
      jsonStr = jsonStr.replace(/: "([^"]*)"/g, (match) => {
        return match
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r")
          .replace(/\t/g, "\\t");
      });

      cleanedText = jsonStr;
    }

    // Parse the JSON response
    let campaignData: any = null;
    try {
      campaignData = JSON.parse(cleanedText);
    } catch (parseError) {
      throw new Error("Failed to parse campaign data - invalid JSON from AI");
    }

    // Validate required fields
    if (!campaignData.subject || !campaignData.htmlContent) {
      return NextResponse.json(
        { success: false, message: "Invalid campaign data generated" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      campaign: {
        subject: campaignData.subject,
        preview: campaignData.preview || campaignData.subject.substring(0, 100),
        htmlContent: campaignData.htmlContent,
      },
      message: `Campaign generated successfully (powered by ${usedProvider})`,
      provider: usedProvider,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to generate campaign",
      },
      { status: 500 },
    );
  }
}
