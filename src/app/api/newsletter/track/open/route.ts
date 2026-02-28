// src/app/api/newsletter/track/open/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/server/db";
import { NewsletterCampaign } from "@/models/newsletterCampaign.model";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=",
  "base64"
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");

    if (!campaignId) {
      return new NextResponse(PIXEL, {
        status: 200,
        headers: {
          "Content-Type": "image/gif",
          "Content-Length": PIXEL.length.toString(),
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    await dbConnect();
    await NewsletterCampaign.updateOne({ _id: campaignId }, { $inc: { openCount: 1 } });

    return new NextResponse(PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": PIXEL.length.toString(),
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Open tracking error:", error);
    return new NextResponse(PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": PIXEL.length.toString(),
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }
}
