// src/app/api/newsletter/unsubscribe/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/server/db";
import { NewsletterSubscriber } from "@/models/newsletterSubscriber.model";
import { buildAppUrl } from "@/lib/config/urls";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.toLowerCase().trim() || "";

  if (!email) {
    return NextResponse.redirect(buildAppUrl("/newsletter/unsubscribed?status=invalid"));
  }

  await dbConnect();

  const doc = await NewsletterSubscriber.findOne({ email });
  if (!doc) {
    return NextResponse.redirect(buildAppUrl("/newsletter/unsubscribed?status=invalid"));
  }

  doc.unsubscribedAt = new Date();
  await doc.save();

  {
    return NextResponse.redirect(buildAppUrl("/newsletter/unsubscribed?status=success"));
  }
}
