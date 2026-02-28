// src/app/api/auth/verify-reset-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { verifyResetToken, markTokenAsVerified } from "@/lib/server/redis";
import bcrypt from "bcryptjs";
import { sendEmailRaw } from "@/lib/server/email";
import { passwordResetSuccessEmail } from "@/lib/server/emailTemplates";

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const { token, newPassword, confirmPassword } = await request.json();

    // Validation
    if (!token || !newPassword || !confirmPassword) {
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

    // Verify reset token
    const tokenData = await verifyResetToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email: tokenData.email });
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
        tokenData.email,
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
    console.error("Reset token verification error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// GET endpoint to verify token validity
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token is required" },
        { status: 400 }
      );
    }

    const tokenData = await verifyResetToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Token is valid", email: tokenData.email, type: tokenData.type },
      { status: 200 }
    );
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred" },
      { status: 500 }
    );
  }
}
