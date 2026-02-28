// src/app/api/admin/newsletter/bulk-send/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/server/db";
import { User } from "@/models/user.model";
import { NewsletterSubscriber } from "@/models/newsletterSubscriber.model";
import { sendEmailRaw } from "@/lib/server/email";
import { buildAppUrl } from "@/lib/config/urls";

// Send bulk email to all users or specific groups
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles?.includes("admin")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { subject, htmlContent, recipientType } = body;

    if (!subject || !htmlContent) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    let recipients: { email: string; name: string }[] = [];

    // Get recipients based on type
    if (recipientType === "all-users") {
      // Get all registered users
      const users = await User.find({}).select("email name").lean();
      recipients = users.map((u) => ({ email: u.email, name: u.name || "Valued Customer" }));
    } else if (recipientType === "verified-subscribers") {
      // Get verified newsletter subscribers
      const subscribers = await NewsletterSubscriber.find({ 
        verified: true, 
        unsubscribedAt: null 
      }).select("email name").lean();
      recipients = subscribers.map((s) => ({ email: s.email, name: s.name || "Valued Customer" }));
    } else if (recipientType === "all-subscribers") {
      // Get all newsletter subscribers (including unverified)
      const subscribers = await NewsletterSubscriber.find({ 
        unsubscribedAt: null 
      }).select("email name").lean();
      recipients = subscribers.map((s) => ({ email: s.email, name: s.name || "Valued Customer" }));
    } else {
      return NextResponse.json({ success: false, message: "Invalid recipient type" }, { status: 400 });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, message: "No recipients found" }, { status: 400 });
    }

    // Remove duplicate emails
    const uniqueRecipients = Array.from(
      new Map(recipients.map((r) => [r.email, r])).values()
    );

    // Send emails in batches
    const batchSize = 50;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < uniqueRecipients.length; i += batchSize) {
      const batch = uniqueRecipients.slice(i, i + batchSize);
      const promises = batch.map(async (recipient) => {
        try {
          // Replace placeholder with actual user name
          const contentHtml = htmlContent.replace(/{{userName}}/g, recipient.name);

          // Detect if incoming HTML already has full document or header
          const hasFullDoc = contentHtml.includes('<!DOCTYPE') || contentHtml.includes('<html');
          const hasSnapcartHeader = /Snapcart<\/h1>/i.test(contentHtml) || /Fresh Groceries at Your Doorstep/i.test(contentHtml) || /linear-gradient\(135deg, #16a34a 0%, #15803d 100%\)/i.test(contentHtml);

          let fullHtml: string;
          if (hasFullDoc) {
            fullHtml = contentHtml; // already complete
          } else {
            const headerBlock = hasSnapcartHeader
              ? ''
              : `<div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">Snapcart</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Fresh Groceries at Your Doorstep</p>
    </div>`;

            fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', 'Helvetica', sans-serif; background-color: #f9fafb;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 20px auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    ${headerBlock}
    <div style="padding: 30px; color: #1f2937;">
      ${contentHtml}
    </div>
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <div style="padding: 20px 30px; background-color: #f3f4f6; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; text-align: center;">
      <p style="margin: 5px 0;">
        <a href="${buildAppUrl()}" style="color: #16a34a; text-decoration: none;">Visit Website</a> | 
        <a href="${buildAppUrl("/contact")}" style="color: #16a34a; text-decoration: none;">Contact Us</a> | 
        <a href="${buildAppUrl("/newsletter/unsubscribed")}" style="color: #16a34a; text-decoration: none;">Unsubscribe</a>
      </p>
      <p style="margin: 8px 0 0 0;">© ${new Date().getFullYear()} Snapcart. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
          }

          // Personalize the subject line as well
          const personalizedSubject = subject.replace(/{{userName}}/g, recipient.name);

          await sendEmailRaw(recipient.email, personalizedSubject, fullHtml);
          successCount++;
        } catch (error) {
          console.error(`Failed to send bulk email to ${recipient.email}:`, error);
          failCount++;
        }
      });
      await Promise.all(promises);

      // Small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk email sent to ${successCount} recipients`,
      successCount,
      failCount,
      totalRecipients: recipients.length,
    });
  } catch (error) {
    console.error("Error sending bulk email:", error);
    return NextResponse.json({ success: false, message: "Failed to send bulk email" }, { status: 500 });
  }
}
