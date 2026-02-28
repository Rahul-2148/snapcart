import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { SuggestionFeedback } from "@/models/suggestionFeedback.model";

export const dynamic = "force-dynamic";

function normalizeSuggestionKey(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const suggestion = (body?.suggestion || "").toString().trim();
    const sentiment = (body?.sentiment || "").toString().trim().toLowerCase();

    if (!suggestion) {
      return NextResponse.json({ success: false, message: "Suggestion is required" }, { status: 400 });
    }

    if (suggestion.length > 220) {
      return NextResponse.json({ success: false, message: "Suggestion too long" }, { status: 400 });
    }

    if (sentiment !== "up" && sentiment !== "down") {
      return NextResponse.json({ success: false, message: "Invalid sentiment" }, { status: 400 });
    }

    await connectDb();

    const suggestionKey = normalizeSuggestionKey(suggestion);

    await SuggestionFeedback.findOneAndUpdate(
      {
        userId: session.user.id,
        suggestionKey,
      },
      {
        $set: {
          userId: session.user.id,
          suggestion,
          suggestionKey,
          sentiment,
        },
      },
      {
        upsert: true,
        new: true,
      },
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save feedback";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
