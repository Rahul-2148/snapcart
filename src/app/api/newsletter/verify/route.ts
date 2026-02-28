// src/app/api/newsletter/verify/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/server/db";
import { NewsletterSubscriber } from "@/models/newsletterSubscriber.model";
import { buildAppUrl } from "@/lib/config/urls";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.toLowerCase().trim() || "";
    const token = searchParams.get("token") || "";

    console.log("[Verify] Received link click:", { email, tokenHash: token.slice(0, 8) + "..." });

    if (!email || !token) {
      console.log("[Verify] Missing email or token");
      return NextResponse.redirect(buildAppUrl("/newsletter/verified?status=invalid"));
    }

    await dbConnect();

    const doc = await NewsletterSubscriber.findOne({ email });
    if (!doc) {
      console.log("[Verify] No subscriber found:", email);
      return NextResponse.redirect(buildAppUrl("/newsletter/verified?status=invalid"));
    }
    
    console.log("[Verify] DB doc found:", { email, hasToken: !!doc.verificationToken, dbTokenHash: doc.verificationToken?.slice(0, 8), urlTokenHash: token.slice(0, 8), match: doc.verificationToken === token });
    
    if (!doc.verificationToken || doc.verificationToken !== token) {
      console.log("[Verify] Token mismatch!");
      return NextResponse.redirect(buildAppUrl("/newsletter/verified?status=invalid"));
    }

  if (doc.verificationExpires && doc.verificationExpires.getTime() < Date.now()) {
    return NextResponse.redirect(buildAppUrl("/newsletter/verified?status=expired"));
  }

    doc.verified = true;
    doc.verificationToken = undefined;
    doc.verificationExpires = undefined;
    doc.unsubscribedAt = null;
    await doc.save();

    return NextResponse.redirect(buildAppUrl("/newsletter/verified?status=success"));
  } catch (error) {
    console.error("[Verify] Error:", error);
    return NextResponse.redirect(buildAppUrl("/newsletter/verified?status=error"));
  }
}
