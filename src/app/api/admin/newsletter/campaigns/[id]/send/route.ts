// src/app/api/admin/newsletter/campaigns/[id]/send/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/server/db";
import { NewsletterCampaign } from "@/models/newsletterCampaign.model";
import { NewsletterSubscriber } from "@/models/newsletterSubscriber.model";
import { User } from "@/models/user.model";
import { sendEmailRaw } from "@/lib/server/email";
import { buildAppUrl, getAppBaseUrl } from "@/lib/config/urls";

// Send campaign
export async function POST(
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

    if (campaign.status === "sent") {
      return NextResponse.json(
        { success: false, message: "Campaign already sent" },
        { status: 400 },
      );
    }

    // Get recipients with names
    let recipients: { email: string; name: string }[] = [];
    if (campaign.sentTo === "custom" && campaign.customRecipients) {
      recipients = campaign.customRecipients.map((email) => ({
        email,
        name: "Valued Customer",
      }));
    } else {
      const filter: any = { verified: true, unsubscribedAt: null };
      const subscribers = await NewsletterSubscriber.find(filter)
        .select("email name")
        .lean();

      // Also fetch from User model to get names for registered users
      const subscriberEmails = subscribers.map((s) => s.email);
      const users = await User.find({ email: { $in: subscriberEmails } })
        .select("email name")
        .lean();
      const userMap = new Map(users.map((u) => [u.email, u.name]));

      // Merge names: use User name first, then NewsletterSubscriber name, then fallback
      recipients = subscribers.map((s) => ({
        email: s.email,
        name: userMap.get(s.email) || s.name || "Valued Customer",
      }));
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, message: "No recipients found" },
        { status: 400 },
      );
    }

    // Send emails (in batches to avoid overwhelming the email service)
    const batchSize = 50;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const promises = batch.map(async (recipient) => {
        try {
          const baseUrl = getAppBaseUrl();
          const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(recipient.email)}`;

          // Get content and personalize
          const contentHtml = campaign.htmlContent || campaign.content;
          let personalizedHtml = contentHtml.replace(
            /{{userName}}/g,
            recipient.name,
          );

          // Add click tracking: wrap outbound links through tracking endpoint
          personalizedHtml = personalizedHtml.replace(
            /href="(https?:[^"]+)"/g,
            (_, url) => {
              const tracked = `${baseUrl}/api/newsletter/track/click?campaignId=${campaign._id}&email=${encodeURIComponent(recipient.email)}&url=${encodeURIComponent(url)}`;
              return `href="${tracked}"`;
            },
          );

          // Add open tracking pixel at end of body content
          const trackingPixel = `<img src="${baseUrl}/api/newsletter/track/open?campaignId=${campaign._id}&email=${encodeURIComponent(recipient.email)}" alt="" width="1" height="1" style="display:none;" />`;
          personalizedHtml += trackingPixel;

          // ALWAYS wrap with Snapcart header/footer (content is body-only from AI or manual)
          const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', 'Helvetica', sans-serif; background-color: #f9fafb;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 20px auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    ${personalizedHtml}
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <div style="padding: 20px 30px; background-color: #f3f4f6; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; text-align: center;">
      <p style="margin: 5px 0;">
        <a href="${buildAppUrl()}" style="color: #16a34a; text-decoration: none;">Visit Website</a> | 
        <a href="${buildAppUrl("/contact")}" style="color: #16a34a; text-decoration: none;">Contact Us</a> | 
        <a href="${unsubscribeUrl}" style="color: #16a34a; text-decoration: none;">Unsubscribe</a>
      </p>
      <p style="margin: 8px 0 0 0;">© ${new Date().getFullYear()} Snapcart. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

          // Personalize the subject line
          const personalizedSubject = campaign.subject.replace(
            /{{userName}}/g,
            recipient.name,
          );

          await sendEmailRaw(recipient.email, personalizedSubject, fullHtml);
          successCount++;
        } catch (error) {
          console.error(`Failed to send to ${recipient.email}:`, error);
          failCount++;
        }
      });
      await Promise.all(promises);

      // Small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status
    campaign.status = failCount === 0 ? "sent" : "failed";
    campaign.sentAt = new Date();
    campaign.recipientCount = successCount;
    await campaign.save();

    return NextResponse.json({
      success: true,
      message: `Campaign sent to ${successCount} recipients`,
      successCount,
      failCount,
    });
  } catch (error) {
    console.error("Error sending campaign:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send campaign" },
      { status: 500 },
    );
  }
}
