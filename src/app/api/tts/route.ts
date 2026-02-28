import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

function normalizeText(value: unknown) {
  return (value || "").toString().trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = normalizeText(body?.text);

    if (!text) {
      return NextResponse.json({ success: false, message: "Text is required" }, { status: 400 });
    }

    if (text.length > 2200) {
      return NextResponse.json({ success: false, message: "Text is too long for audio" }, { status: 400 });
    }

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenlabsApiKey) {
      return NextResponse.json(
        { success: false, message: "Neural TTS is not configured" },
        { status: 503 },
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": elevenlabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.34,
            similarity_boost: 0.84,
            style: 0.55,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          message: `Neural TTS failed: ${response.status}`,
          detail: errorText,
        },
        { status: 502 },
      );
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected TTS error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
