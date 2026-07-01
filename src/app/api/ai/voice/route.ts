import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { runOrchestrator } from "@/lib/server/ai/agents/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("file") as File;

    if (!audioFile) {
      return NextResponse.json({ success: false, message: "No audio file provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, message: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const base64Data = buffer.toString("base64");

    const modelCandidates = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let response: Response | null = null;
    let lastError: Error | null = null;

    for (const model of modelCandidates) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: "Transcribe the following voice message into a clean, normal text command. Return only the transcription." },
                    {
                      inlineData: {
                        mimeType: audioFile.type || "audio/wav",
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
            }),
          }
        );
        if (response.ok) {
          break;
        } else {
          const errText = await response.text();
          console.warn(`Voice call failed for model ${model}: status ${response.status}. Response: ${errText}`);
          lastError = new Error(`Voice call failed for model ${model}: status ${response.status}`);
        }
      } catch (err: any) {
        console.warn(`Voice call failed for model ${model}: ${err.message}`);
        lastError = err;
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error("Gemini audio processing failed for all models");
    }

    const json = await response.json();
    const transcribedText = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!transcribedText) {
      return NextResponse.json({ success: false, message: "Could not transcribe audio content." }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id || "000000000000000000000000";
    const role = session?.user?.currentRole || "user";

    await connectDb();

    // Route the transcribed query through multi-agent orchestrator
    const agentResult = await runOrchestrator({
      userId,
      role,
      message: transcribedText,
    });

    return NextResponse.json({
      success: true,
      transcribedText,
      reply: agentResult.reply,
      actions: agentResult.actions,
    });
  } catch (error: any) {
    console.error("AI voice API gateway error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to process audio query" }, { status: 500 });
  }
}
