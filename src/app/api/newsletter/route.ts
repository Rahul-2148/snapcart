// src/app/api/newsletter/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/server/db";
import { NewsletterSubscriber } from "@/models/newsletterSubscriber.model";
import crypto from "node:crypto";
import { sendNewsletterVerificationEmail, sendNewsletterUnsubscribeEmail } from "@/lib/server/email";
import { rateLimit } from "@/lib/server/rateLimit";
import { buildAppUrl } from "@/lib/config/urls";

function isValidEmail(email: string) {
  return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toString().trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ success: false, message: "Invalid email" }, { status: 400 });
    }

    // Basic rate-limit per IP for subscription
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const rl = rateLimit(`newsletter:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ success: false, message: "Too many requests, try again later" }, { status: 429 });
    }

    await dbConnect();

    const existing = await NewsletterSubscriber.findOne({ email });
    if (existing) {
      // Always regenerate token for resubscribing
      const newToken = crypto.randomBytes(24).toString("hex");
      existing.verificationToken = newToken;
      existing.verificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);
      existing.verified = false;
      existing.unsubscribedAt = null;
      await existing.save();
      
      const verifyUrl = `${buildAppUrl("/api/newsletter/verify")}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(newToken)}`;
      const unsubscribeUrl = `${buildAppUrl("/api/newsletter/unsubscribe")}?email=${encodeURIComponent(email)}`;
      console.log("[Newsletter] Existing subscriber - token regenerated", { email, tokenHash: newToken.slice(0, 8) + "..." });
      await sendNewsletterVerificationEmail(email, verifyUrl);
      await sendNewsletterUnsubscribeEmail(email, unsubscribeUrl);
      return NextResponse.json({ success: true, message: "Check your email to confirm subscription" });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const doc = await NewsletterSubscriber.create({ email, verificationToken: token, verificationExpires: new Date(Date.now() + 1000 * 60 * 60 * 24) });
    const verifyUrl = `${buildAppUrl("/api/newsletter/verify")}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    const unsubscribeUrl = `${buildAppUrl("/api/newsletter/unsubscribe")}?email=${encodeURIComponent(email)}`;
    console.log("[Newsletter] Verification URL:", verifyUrl);
    console.log("[Newsletter] Token saved:", token);
    await sendNewsletterVerificationEmail(email, verifyUrl);
    await sendNewsletterUnsubscribeEmail(email, unsubscribeUrl);

    return NextResponse.json({ success: true, message: "Check your email to confirm subscription" });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json({ success: false, message: "Subscription failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await dbConnect();
    const list = await NewsletterSubscriber.find({}).sort({ subscribedAt: -1 }).select("email verified unsubscribedAt subscribedAt").lean();
    return NextResponse.json({ success: true, subscribers: list });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
