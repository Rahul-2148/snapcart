// src/app/api/admin/coupon/get-single/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Coupon } from "@/models/coupon.model";
import { CouponUsage } from "@/models/couponUsage.model";
import { User } from "@/models/user.model";
import mongoose from "mongoose";
import "@/models/category.model";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: couponId } = await params;
  try {
    await connectDb();

    /* ================= AUTH ================= */
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const admin = await User.findOne({ email: session.user.email });
    if (!admin || admin.role !== "admin") {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 403 }
      );
    }

    /* ================= PARAM VALIDATION ================= */

    if (!couponId || !mongoose.Types.ObjectId.isValid(couponId)) {
      return NextResponse.json(
        { message: "Invalid coupon id" },
        { status: 400 }
      );
    }

    /* ================= COUPON ================= */
    const coupon = await Coupon.findById(couponId)
      .populate("createdBy", "name email")
      .populate("applicableCategories", "name")
      .populate("applicableProducts", "name")
      .lean();

    if (!coupon) {
      return NextResponse.json(
        { message: "Coupon not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    return NextResponse.json({
      success: true,
      coupon: {
        ...coupon,
        usageCount: coupon.usageCount || 0,
        isExpired: coupon.endDate < now,
        isUpcoming: coupon.startDate > now,
        isCurrentlyActive:
          coupon.isActive && coupon.startDate <= now && coupon.endDate >= now,
      },
    });
  } catch (error: any) {
    console.error("Get single coupon error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
