import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { sendEmail } from "@/lib/server/email";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const { action, otp, role } = await req.json();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "send") {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      user.roleOtp = generatedOtp;
      user.roleOtpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins validity
      user.isRoleOtpVerified = false;
      await user.save();

      // Send OTP via Email
      const emailContent = `
        <div class="content">
          <h2>Security Verification Required 🔒</h2>
          <p>Hi ${user.name},</p>
          <p>We received a request to switch your active role on SnapCart to <strong>${role === "storeManager" ? "Store Manager" : "Delivery Partner"}</strong>.</p>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px;">
            <p style="color: #374151; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">Enter the following OTP code on the verification screen:</p>
            <h1 style="color: #059669; font-size: 36px; font-weight: 800; letter-spacing: 6px; margin: 10px 0;">${generatedOtp}</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 12px;">This code is valid for 5 minutes.</p>
          </div>

          <p style="color: #ef4444; font-size: 13px; font-weight: 600;">
            ⚠️ Do not share this OTP with anyone, including SnapCart staff.
          </p>

          <p style="margin-top: 30px;">
            If you did not request this, please change your password immediately or contact support.
          </p>
          
          <p>
            Best regards,<br>
            <strong>The SnapCart Security Team</strong>
          </p>
        </div>
      `;

      await sendEmail(
        user.email,
        "Security Verification Code - Role Switch Request",
        emailContent
      );

      return NextResponse.json({
        success: true,
        message: "OTP sent successfully to your email address",
      });
    }

    if (action === "verify") {
      if (!otp) {
        return NextResponse.json({ error: "OTP code is required" }, { status: 400 });
      }

      if (!user.roleOtp || user.roleOtp !== otp) {
        return NextResponse.json({ error: "Invalid OTP code" }, { status: 400 });
      }

      if (user.roleOtpExpires && new Date() > user.roleOtpExpires) {
        return NextResponse.json({ error: "OTP code has expired" }, { status: 400 });
      }

      user.isRoleOtpVerified = true;
      user.roleOtp = undefined;
      user.roleOtpExpires = undefined;
      await user.save();

      return NextResponse.json({
        success: true,
        message: "OTP verified successfully!",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Role OTP API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
