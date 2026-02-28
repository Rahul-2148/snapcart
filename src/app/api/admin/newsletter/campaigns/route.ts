// src/app/api/admin/newsletter/campaigns/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/server/db";
import { NewsletterCampaign } from "@/models/newsletterCampaign.model";
import { NewsletterSubscriber } from "@/models/newsletterSubscriber.model";

// Get all campaigns
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    await dbConnect();

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const campaigns = await NewsletterCampaign.find(filter)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .lean();

    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch campaigns" },
      { status: 500 },
    );
  }
}

// Create new campaign
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      title,
      subject,
      content,
      htmlContent,
      sentTo,
      customRecipients,
      scheduledAt,
      metadata,
    } = body;

    if (!title || !subject || !content) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Calculate recipient count
    let recipientCount = 0;
    if (sentTo === "custom" && customRecipients?.length > 0) {
      recipientCount = customRecipients.length;
    } else {
      const filter: any = { verified: true, unsubscribedAt: null };
      recipientCount = await NewsletterSubscriber.countDocuments(filter);
    }

    const campaign = await NewsletterCampaign.create({
      title,
      subject,
      content,
      htmlContent,
      sentTo: sentTo || "verified",
      customRecipients,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      status: scheduledAt ? "scheduled" : "draft",
      recipientCount,
      createdBy: session.user.id,
      metadata,
    });

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create campaign" },
      { status: 500 },
    );
  }
}
