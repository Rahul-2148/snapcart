// src/app/api/returns/list/route.ts
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    let query: any = { user: session.user.id };
    if (status) {
      query.status = status;
    }

    const returnRequests = await ReturnRequest.find(query)
      .populate("order")
      .populate("orderItem")
      .populate("grocery")
      .sort({ requestedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await ReturnRequest.countDocuments(query);

    return NextResponse.json({
      returnRequests,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List returns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch return requests" },
      { status: 500 },
    );
  }
}
