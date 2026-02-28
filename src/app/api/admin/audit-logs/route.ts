import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import AuditLog from "@/models/auditLog.model";
import { User } from "@/models/user.model";

const parseNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const { searchParams } = new URL(req.url);
    const page = parseNumber(searchParams.get("page"), 1);
    const limit = parseNumber(searchParams.get("limit"), 20);
    const action = searchParams.get("action") || "";
    const userId = searchParams.get("userId") || "";
    const search = searchParams.get("search") || "";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const query: Record<string, any> = {};

    if (action && action !== "all") {
      query.action = action;
    }

    if (userId) {
      query.userId = userId;
    }

    if (from || to) {
      query.createdAt = {};
      if (from) {
        query.createdAt.$gte = new Date(from);
      }
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      const regex = new RegExp(search, "i");
      const matchedUsers = await User.find({
        $or: [
          { name: { $regex: regex } },
          { email: { $regex: regex } },
          { mobileNumber: { $regex: regex } },
        ],
      })
        .select("_id")
        .lean();

      const matchedUserIds = matchedUsers.map((user) => user._id);

      query.$or = [
        { action: { $regex: regex } },
        { "metadata.source": { $regex: regex } },
      ];

      if (matchedUserIds.length > 0) {
        query.$or.push({ userId: { $in: matchedUserIds } });
      }
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "name email mobileNumber")
      .lean();

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { message: `Error fetching audit logs: ${error.message}` },
      { status: 500 },
    );
  }
}
