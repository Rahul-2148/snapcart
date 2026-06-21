// src/app/api/admin/store-managers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    // Fetch all users holding either storeManager or admin roles
    const managers = await User.find({
      roles: { $in: ["storeManager", "admin"] },
      isBlocked: { $ne: true },
    })
      .select("_id name email mobileNumber")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ managers });
  } catch (error: any) {
    console.error("GET Store Managers Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
