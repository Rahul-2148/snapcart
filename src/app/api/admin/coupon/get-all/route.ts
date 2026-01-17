// src/app/api/admin/coupon/get-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Coupon } from "@/models/coupon.model";
import { User } from "@/models/user.model";
import "@/models/category.model";

export async function GET(req: NextRequest) {
  try {
    await connectDb();

    // Check admin authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status"); // active, expired, upcoming
    const eventTag = searchParams.get("eventTag");

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { eventTag: { $regex: search, $options: "i" } },
      ];
    }

    if (eventTag) {
      query.eventTag = eventTag;
    }

    // Filter by status
    const now = new Date();
    if (status === "active") {
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    } else if (status === "expired") {
      query.endDate = { $lt: now };
    } else if (status === "upcoming") {
      query.startDate = { $gt: now };
    } else if (status === "inactive") {
      query.isActive = false;
    }

    // Get total count
    const total = await Coupon.countDocuments(query);

    // Get coupons with pagination
    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("createdBy", "name email")
      .populate("applicableCategories", "name")
      .populate("applicableProducts", "name");

    // Format response
    const formattedCoupons = coupons.map((coupon) => ({
      _id: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minCartValue: coupon.minCartValue,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      usageLimit: coupon.usageLimit,
      usagePerUser: coupon.usagePerUser,
      usageCount: coupon.usageCount || 0,
      eventTag: coupon.eventTag,
      isActive: coupon.isActive,
      applicableCategories: coupon.applicableCategories,
      applicableProducts: coupon.applicableProducts,
      createdBy: coupon.createdBy,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
      status:
        coupon.endDate < now
          ? "expired"
          : coupon.startDate > now
          ? "upcoming"
          : coupon.isActive
          ? "active"
          : "inactive",
    }));

    return NextResponse.json({
      success: true,
      coupons: formattedCoupons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Get all coupons error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
