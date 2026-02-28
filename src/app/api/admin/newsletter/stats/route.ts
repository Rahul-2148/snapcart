// src/app/api/admin/newsletter/stats/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/server/db";
import { NewsletterSubscriber } from "@/models/newsletterSubscriber.model";
import { NewsletterCampaign } from "@/models/newsletterCampaign.model";
import { newsletterTemplates } from "@/lib/server/newsletterTemplates";

// Get newsletter statistics
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles?.includes("admin")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    await dbConnect();

    const [
      totalSubscribers,
      verifiedSubscribers,
      unverifiedSubscribers,
      unsubscribed,
      totalCampaigns,
      sentCampaigns,
      draftCampaigns,
      scheduledCampaigns,
    ] = await Promise.all([
      NewsletterSubscriber.countDocuments({}),
      NewsletterSubscriber.countDocuments({ verified: true, unsubscribedAt: null }),
      NewsletterSubscriber.countDocuments({ verified: false }),
      NewsletterSubscriber.countDocuments({ unsubscribedAt: { $ne: null } }),
      NewsletterCampaign.countDocuments({}),
      NewsletterCampaign.countDocuments({ status: "sent" }),
      NewsletterCampaign.countDocuments({ status: "draft" }),
      NewsletterCampaign.countDocuments({ status: "scheduled" }),
    ]);

    const totalTemplates = Object.keys(newsletterTemplates).length;

    // Get recent campaigns for analytics
    const recentCampaigns = await NewsletterCampaign.find({ status: "sent" })
      .sort({ sentAt: -1 })
      .limit(5)
      .select("title subject recipientCount openCount clickCount sentAt")
      .lean();

    const stats = {
      subscribers: {
        total: totalSubscribers,
        verified: verifiedSubscribers,
        unverified: unverifiedSubscribers,
        unsubscribed,
      },
      campaigns: {
        total: totalCampaigns,
        sent: sentCampaigns,
        draft: draftCampaigns,
        scheduled: scheduledCampaigns,
      },
      templates: {
        total: totalTemplates,
      },
      recentCampaigns,
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch stats" }, { status: 500 });
  }
}
