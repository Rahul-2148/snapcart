// src/app/api/newsletter/track/click/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/server/db";
import { NewsletterCampaign } from "@/models/newsletterCampaign.model";
import { getAppBaseUrl } from "@/lib/config/urls";

function isAllowedUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");
  const url = searchParams.get("url") || "";

  const target = isAllowedUrl(url) ? url : getAppBaseUrl();

  try {
    if (campaignId) {
      await dbConnect();
      await NewsletterCampaign.updateOne({ _id: campaignId }, { $inc: { clickCount: 1 } });
    }
  } catch (error) {
    console.error("Click tracking error:", error);
  }

  return NextResponse.redirect(target, { status: 302 });
}
