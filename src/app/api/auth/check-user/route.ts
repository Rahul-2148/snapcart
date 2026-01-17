// src/app/api/auth/check-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });

    return NextResponse.json(
      {
        exists: !!user,
        isGoogleUser: user?.isLoginedWithGoogle || false,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error checking user:", error);
    return NextResponse.json(
      { message: `Error checking user: ${error.message}` },
      { status: 500 }
    );
  }
}
