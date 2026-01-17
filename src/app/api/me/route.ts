import { auth } from "@/auth";
import { User } from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "User is not authenticated" },
        { status: 404 }
      );
    }

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const hasPassword = !!user.password;

    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    const userWithHasPassword = {
      ...userWithoutPassword,
      hasPassword,
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
