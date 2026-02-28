// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import bcrypt from "bcryptjs";
import Notification from "@/models/notification.model"; // Import Notification model
import { sendNotification } from "@/lib/server/socket"; // Import sendNotification
import { sendWelcomeEmail } from "@/lib/server/email"; // Import email service

// Register user API
export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const { name, email, password, role, mobileNumber, gender } = await req.json();

    console.log("📝 Registration Request:", { 
      name, 
      email, 
      role, 
      roleType: typeof role,
      mobileNumber 
    });

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

    // Determine initial roles based on user selection
    let initialRoles = ["user"]; // Default role
    let initialCurrentRole = "user"; // Default current role
    
    console.log("🔍 Checking role:", { role, isDeliveryBoy: role === "deliveryBoy" });
    
    if (role === "deliveryBoy") {
      initialRoles = ["user", "deliveryBoy"]; // Both user and delivery boy
      initialCurrentRole = "deliveryBoy"; // Set current role to deliveryBoy
    }
    
    console.log("🎯 Final roles:", { initialRoles, initialCurrentRole });

    // Create user with selected role and mobile
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      mobileNumber: mobileNumber || undefined,
      gender: gender || null,
      roles: initialRoles,
      currentRole: initialCurrentRole,
      isLoginedWithGoogle: false,
      profileCompleted: true,
    });

    console.log("✅ User created:", { 
      id: user._id, 
      roles: user.roles, 
      currentRole: user.currentRole, 
      mobileNumber: user.mobileNumber 
    });

    // Notify all admins about the new user registration
    try {
      const admins = await User.find({ roles: "admin" });
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

    // Send welcome email to the new user
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Do not block user registration if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          roles: user.roles,
          currentRole: user.currentRole,
          mobileNumber: user.mobileNumber,
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
