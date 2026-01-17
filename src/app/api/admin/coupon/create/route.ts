// src/app/api/coupon/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Coupon } from "@/models/coupon.model";
import { User } from "@/models/user.model";

export async function POST(req: NextRequest) {
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

    const body = await req.json();

    // Validate required fields
    const {
      code,
      discountType,
      discountValue,
      startDate,
      endDate,
      minCartValue = 0,
      maxDiscountAmount,
      usageLimit,
      usagePerUser,
      eventTag,
      applicableCategories,
      applicableProducts,
    } = body;

    if (!code || !discountType || !discountValue || !startDate || !endDate) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate discount value
    if (discountValue <= 0) {
      return NextResponse.json(
        { message: "Discount value must be greater than 0" },
        { status: 400 }
      );
    }

    if (discountType === "PERCENTAGE" && discountValue > 100) {
      return NextResponse.json(
        { message: "Percentage discount cannot exceed 100%" },
        { status: 400 }
      );
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({
      code: code.toUpperCase(),
    });

    if (existingCoupon) {
      return NextResponse.json(
        { message: "Coupon code already exists" },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return NextResponse.json(
        { message: "End date must be after start date" },
        { status: 400 }
      );
    }

    if (end < new Date()) {
      return NextResponse.json(
        { message: "End date cannot be in the past" },
        { status: 400 }
      );
    }

    // Create coupon
    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      maxDiscountAmount:
        discountType === "PERCENTAGE" ? maxDiscountAmount : undefined,
      minCartValue,
      startDate: start,
      endDate: end,
      usageLimit,
      usagePerUser,
      applicableCategories,
      applicableProducts,
      eventTag,
      isActive: true,
      createdBy: user._id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Coupon created successfully",
        coupon: coupon,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create coupon error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
