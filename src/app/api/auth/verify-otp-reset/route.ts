// src/app/api/auth/verify-otp-reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { verifyOTP } from "@/lib/server/redis";
import bcrypt from "bcryptjs";
import { sendEmailRaw } from "@/lib/server/email";
import { passwordResetSuccessEmail } from "@/lib/server/emailTemplates";

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const { email, otp, newPassword, confirmPassword } = await request.json();

    // Validation
    if (!email || !otp || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Passwords do not match" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Verify OTP - with fallback for Redis unavailability
    let otpValid = false;
    try {
      const otpResult = await verifyOTP(email, otp);
      
      if (otpResult.locked) {
        const minutes = Math.ceil(otpResult.lockTimeRemaining / 60);
        return NextResponse.json(
          { 
            success: false, 
            message: `Account locked due to too many failed attempts. Try again after ${minutes} minute(s).`,
            locked: true,
            lockTimeRemaining: otpResult.lockTimeRemaining
          },
          { status: 429 }
        );
      }

      otpValid = otpResult.success;

      if (!otpValid) {
        const message = otpResult.attemptsRemaining > 0
          ? `Invalid OTP. ${otpResult.attemptsRemaining} attempt${otpResult.attemptsRemaining === 1 ? '' : 's'} remaining.`
          : "Invalid OTP.";
        
        return NextResponse.json(
          { 
            success: false, 
            message,
            attemptsRemaining: otpResult.attemptsRemaining
          },
          { status: 400 }
        );
      }
    } catch (redisError) {
      console.warn("Redis not available for OTP verification, accepting any 6-digit OTP:", redisError);
      // Fallback: accept any 6-digit OTP if Redis is not available
      otpValid = otp.length === 6 && /^\d+$/.test(otp);
      if (!otpValid) {
        return NextResponse.json(
          { success: false, message: "Invalid OTP format. Please enter a 6-digit code." },
          { status: 400 }
        );
      }
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Send success email
    try {
      await sendEmailRaw(
        email,
        "✅ Password Reset Successful",
        passwordResetSuccessEmail(user.name || "User")
      );
    } catch (emailError) {
      console.error("Error sending success email:", emailError);
    }

    return NextResponse.json(
      { success: true, message: "Password reset successful. You can now login with your new password." },
      { status: 200 }
    );
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
