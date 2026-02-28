// src/app/api/admin/returns/route.ts
import { auth } from "@/auth";
import { ReturnRequest } from "@/models/returnRequest.model";
import { Grocery } from "@/models/grocery.model";
import connectDb from "@/lib/server/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDb();

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query: any = {};
    if (status) {
      query.status = status;
    }

    console.log("Returns API - Query:", JSON.stringify(query), "Status param:", status, "Page:", page);
    const returnRequests = await ReturnRequest.find(query)
      .populate("order")
      .populate("orderItem")
      .populate("user", "name email mobile")
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
