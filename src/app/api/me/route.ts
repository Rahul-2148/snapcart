import { auth } from "@/auth";
import { User } from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";

export const dynamic = "force-dynamic";

export const GET = async (req: NextRequest) => {
  try {
    await connectDb();
    
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "User is not authenticated" },
        { status: 401 }
      );
    }

    const user = await User.findOne({ email: session.user.email }).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const hasPassword = !!user.password;

    const userWithoutPassword: any = { ...user };
    delete userWithoutPassword.password;

    const userWithHasPassword = {
      ...userWithoutPassword,
      hasPassword,
      gender: userWithoutPassword.gender ?? user.gender ?? null, // Force include
    };

    return NextResponse.json(
      { success: true, user: userWithHasPassword },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `get me error: ${error}` },
      { status: 500 }
    );
  }
};
