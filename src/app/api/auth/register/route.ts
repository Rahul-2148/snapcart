// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import bcrypt from "bcryptjs";
import Notification from "@/models/notification.model"; // Import Notification model
import { sendNotification } from "@/lib/server/socket"; // Import sendNotification

// Register user API
export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const { name, email, password } = await req.json();

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters long",
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "User already exists with this email" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (no image at registration)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      isLoginedWithGoogle: false,
    });

    // Notify all admins about the new user registration
    try {
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        const newNotification = await Notification.create({
          recipient: admin._id,
          type: "system",
          message: `New user registered: ${user.name} (${user.email})`,
          link: `/admin/users?userId=${user._id}`, // Optional: Link to the new user's admin page
          read: false,
          createdAt: new Date(),
        });
        await sendNotification(admin._id, newNotification);
      }
    } catch (notificationError) {
      console.error(
        "Error sending new user registration notification to admins:",
        notificationError
      );
      // Do not block user registration if notification fails
    }

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, message: `Register error: ${error}` },
      { status: 500 }
    );
  }
}
