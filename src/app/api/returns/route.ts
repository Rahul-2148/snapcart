// src/app/api/returns/route.ts
import { auth } from "@/auth";
import { ReturnRequest } from "@/models/returnRequest.model";
import connectDb from "@/lib/server/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    // Fetch all returns for this user
    const returns = await ReturnRequest.find({ user: session.user.id })
      .populate("order")
      .populate("orderItem")
      .populate("user", "name email mobile")
      .sort({ requestedAt: -1 });

    return NextResponse.json({
      returns,
    });
  } catch (error) {
    console.error("Fetch user returns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 },
    );
  }
}
