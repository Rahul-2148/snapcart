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

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    let otpValid = false;
    let attemptsRemaining = 5;
    let locked = false;

    try {
      const result = await verifyOTP(email, otp);
      if (result.success) {
        otpValid = true;
      } else {
        attemptsRemaining = result.attemptsRemaining;
        locked = result.locked;
      }
    } catch (redisError) {
      console.warn("Redis verify OTP failed, checking DB:", redisError);
    }

    if (!otpValid) {
      // Fallback to database OTP check
      if (
        user.passwordResetOtp &&
        user.passwordResetOtp === otp &&
        user.passwordResetOtpExpires &&
        user.passwordResetOtpExpires > new Date()
      ) {
        otpValid = true;
      }
    }

    if (!otpValid) {
      return NextResponse.json(
        { 
          success: false, 
          message: locked 
            ? `Too many failed attempts. Account locked.` 
            : `Invalid or expired OTP code.` 
        },
        { status: 400 }
      );
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset fields
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpires = undefined;
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
