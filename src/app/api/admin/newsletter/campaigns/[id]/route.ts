// src/app/api/admin/newsletter/campaigns/[id]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/server/db";
import { NewsletterCampaign } from "@/models/newsletterCampaign.model";

// Get single campaign
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.currentRole !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const { id } = await params;
    await dbConnect();

    const campaign = await NewsletterCampaign.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!campaign) {
      return NextResponse.json(
        { success: false, message: "Campaign not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch campaign" },
      { status: 500 },
    );
  }
}

// Update campaign
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await req.json();
    const {
      title,
      subject,
      content,
      htmlContent,
      sentTo,
      customRecipients,
      scheduledAt,
      status,
      metadata,
    } = body;

    await dbConnect();

    const campaign = await NewsletterCampaign.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { success: false, message: "Campaign not found" },
        { status: 404 },
      );
    }

    // Can't edit sent campaigns
    if (campaign.status === "sent") {
      return NextResponse.json(
        { success: false, message: "Cannot edit sent campaigns" },
        { status: 400 },
      );
    }

    if (title) campaign.title = title;
    if (subject) campaign.subject = subject;
    if (content) campaign.content = content;
    if (htmlContent !== undefined) campaign.htmlContent = htmlContent;
    if (sentTo) campaign.sentTo = sentTo;
    if (customRecipients) campaign.customRecipients = customRecipients;
    if (scheduledAt) campaign.scheduledAt = new Date(scheduledAt);
    if (status) campaign.status = status;
    if (metadata) campaign.metadata = metadata;

    await campaign.save();

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update campaign" },
      { status: 500 },
    );
  }
}

// Delete campaign
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const { id } = await params;
    await dbConnect();

    const campaign = await NewsletterCampaign.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { success: false, message: "Campaign not found" },
        { status: 404 },
      );
    }

    // Can't delete sent campaigns
    if (campaign.status === "sent") {
      return NextResponse.json(
        { success: false, message: "Cannot delete sent campaigns" },
        { status: 400 },
      );
    }

    await NewsletterCampaign.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Campaign deleted" });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete campaign" },
      { status: 500 },
    );
  }
}
