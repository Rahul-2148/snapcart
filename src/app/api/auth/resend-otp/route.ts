// src/app/api/auth/resend-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { 
  redis,
  generateAndStoreOTP,
  generateResetToken,
  deleteOTP,
  deleteResetToken,
  isOTPLocked
} from "@/lib/server/redis";
import { sendEmailRaw } from "@/lib/server/email";
import { forgotPasswordEmail } from "@/lib/server/emailTemplates";
import { buildAppUrl } from "@/lib/config/urls";

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    // Check if account is locked
    const lockStatus = await isOTPLocked(email);
    if (lockStatus.locked) {
      const minutes = Math.ceil(lockStatus.remainingTime / 60);
      return NextResponse.json(
        { success: false, message: `Account locked due to too many failed attempts. Please try again after ${minutes} minute(s).`, lockTimeRemaining: lockStatus.remainingTime },
        { status: 429 }
      );
    }

    // Check if OTP exists (not expired)
    const otpData = await redis.get(`otp:${email}`);
    if (!otpData) {
      return NextResponse.json(
        { success: false, message: "OTP not found or expired. Please request a new password reset." },
        { status: 400 }
      );
    }

    // Get user info
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Delete old OTP and reset tokens
    await deleteOTP(email);
    
    // Delete all old reset tokens for this email
    const allKeys = await redis.keys("reset:*");
    for (const key of allKeys) {
      const tokenData = await redis.get(key);
      if (tokenData) {
        const token = typeof tokenData === "string" ? JSON.parse(tokenData) : tokenData;
        if (token.email === email) {
          await deleteResetToken(key.replace("reset:", ""));
        }
      }
    }

    // Generate NEW OTP
    const newOtp = await generateAndStoreOTP(email);

    // Generate NEW reset token
    const newResetToken = await generateResetToken(email, "link");

    // Build new reset link
    const newResetLink = buildAppUrl(`/reset-password/${newResetToken}`);

    // Send email with NEW OTP and NEW reset link
    try {
      await sendEmailRaw(
        email,
        "🔐 Password Reset OTP - Resent",
        forgotPasswordEmail(user.name || "User", newOtp, newResetLink, email)
      );
    } catch (emailError) {
      console.error("Error sending resend email:", emailError);
      return NextResponse.json(
        { success: false, message: "Failed to send email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "OTP resent successfully. Check your email for new OTP and link." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
