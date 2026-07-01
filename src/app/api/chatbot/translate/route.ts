import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { callAiGateway } from "@/lib/server/ai/gateway";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const text = (body?.text || "").toString().trim();
    const targetLang = (body?.targetLang || "hi").toString().trim();

    if (!text) {
      return NextResponse.json({ success: false, message: "Text to translate is required" }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ success: false, message: "Text is too long to translate" }, { status: 400 });
    }

    const languageNames: Record<string, string> = {
      en: "English",
      hi: "Hindi (हिन्दी)",
      hinglish: "Hinglish (Hindi spoken/written using English/Latin alphabet, like 'kya chal raha hai')",
      bn: "Bengali (বাংলা)",
      mr: "Marathi (मराठी)",
      ta: "Tamil (தமிழ்)",
      te: "Telugu (తెలుగు)",
      kn: "Kannada (ಕನ್ನಡ)",
      ml: "Malayalam (മലയാളം)",
      gu: "Gujarati (ગુજરાતી)",
      pa: "Punjabi (ਪੰਜਾਬੀ)",
      ur: "Urdu (اردو)",
      or: "Odia (ଓಡ଼ਿଆ)",
      as: "Assamese (অસમೀয়া)",
    };

    const targetLangName = languageNames[targetLang] || targetLang || "English";

    const systemInstruction = `You are a professional and high-fidelity translator. Your task is to translate the provided text into ${targetLangName}.
CRITICAL REQUIREMENTS:
1. Preserve all markdown syntax, formatting, lists, tables, headers, and spacing EXACTLY.
2. DO NOT translate, change, or modify product names, brand names, price tags (e.g. ₹120 or ₹ 500), variant labels (e.g. "5 kg", "500 gm"), or code blocks (e.g. \`\`\`json ... \`\`\`). Keep them exactly as they are in the original text.
3. Only translate the conversational explanation, descriptions, and directions.
4. Keep the translation natural, clear, and contextually accurate. Do not invent any new information or remove original details.
5. If the input text contains Hinglish (Hindi written in English/Latin script) and the target language is Hindi (हिन्दी), you MUST translate and transliterate it completely into proper, readable Hindi in Devanagari script.
6. If the input text contains Hinglish and the target language is English, you MUST translate it completely into proper English.`;

    let translatedText = "";
    let useGeminiFallback = false;

    // Try Google Translate first for instant (~50-100ms) translations
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.[0])) {
          translatedText = json[0].map((item: any) => item[0]).join("");
        }
      }

      // If target is Hindi but the translated text doesn't contain any Devanagari characters,
      // it means Google Translate detected the input Hinglish as Hindi and returned it unmodified in Latin script.
      // We force sl=en to compel it to translate/transliterate the Latin script words into Devanagari.
      if (targetLang === "hi" && translatedText && !/[\u0900-\u097F]/.test(translatedText)) {
        const forceUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(text)}`;
        const forceRes = await fetch(forceUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        if (forceRes.ok) {
          const forceJson = await forceRes.ok ? await forceRes.json() : null;
          if (forceJson && Array.isArray(forceJson[0])) {
            translatedText = forceJson[0].map((item: any) => item[0]).join("");
          }
        }
      }

      if (!translatedText) {
        useGeminiFallback = true;
      }
    } catch (err) {
      console.warn("Google Translate failed, falling back to Gemini:", err);
      useGeminiFallback = true;
    }

    // Fallback to Gemini if Google Translate fails
    if (useGeminiFallback) {
      try {
        const gatewayResult = await callAiGateway({
          userId: session?.user?.id || "000000000000000000000000",
          role: session?.user?.currentRole || "guest",
          prompt: `Original Text to Translate:\n"${text}"`,
          systemInstruction,
          taskType: "chat",
        });

        if (gatewayResult.success && gatewayResult.reply) {
          translatedText = gatewayResult.reply;
        }
      } catch (geminiErr) {
        console.error("All translation fallback mechanisms failed:", geminiErr);
      }
    }

    if (translatedText) {
      return NextResponse.json({
        success: true,
        translatedText,
      });
    }

    return NextResponse.json({
      success: false,
      message: "Translation failed across all engines",
    }, { status: 500 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Translation route encountered an error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
