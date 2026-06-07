// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { 
  generateAndStoreOTP, 
  generateResetToken, 
  isOTPLocked,
  checkForgotPasswordRateLimit
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

    // Try Redis rate limiting, but skip if Redis is not available
    let otp: string;
    let resetToken: string;
    let redisAvailable = true;

    try {
      // Check email-based rate limit (1 request per 2 minutes per email)
      const emailRateLimit = await checkForgotPasswordRateLimit(email, 2);
      if (!emailRateLimit.allowed) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Please wait ${Math.ceil(emailRateLimit.remainingTime / 60)} minute(s) before requesting another password reset.`,
            remainingTime: emailRateLimit.remainingTime
          },
          { status: 429 }
        );
      }

      // Check if OTP is locked (5 failed attempts)
      const lockStatus = await isOTPLocked(email);
      if (lockStatus.locked) {
        const minutes = Math.ceil(lockStatus.remainingTime / 60);
        return NextResponse.json(
          { success: false, message: `Too many failed attempts. Please try again after ${minutes} minute(s).` },
          { status: 429 }
        );
      }

      // Generate OTP
      otp = await generateAndStoreOTP(email);

      // Generate reset token for link-based reset
      resetToken = await generateResetToken(email, "link");
    } catch (redisError) {
      console.warn("Redis not available, using fallback:", redisError);
      redisAvailable = false;
      // Generate OTP without Redis storage
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists for security
      return NextResponse.json(
        { success: true, message: "If an account exists with this email, you will receive a password reset email shortly." },
        { status: 200 }
      );
    }

    // Build reset link
    const resetLink = buildAppUrl(`/reset-password/${resetToken}`);

    // Send combined password reset email with both OTP and reset link
    try {
      await sendEmailRaw(
        email,
        "🔐 Password Reset Request - Choose Your Method",
        forgotPasswordEmail(user.name || "User", otp, resetLink, email)
      );
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);
      return NextResponse.json(
        { success: false, message: "Failed to send reset email. Please check your email configuration." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "If an account exists with this email, you will receive a password reset email shortly." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
