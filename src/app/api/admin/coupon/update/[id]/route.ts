// src/app/api/coupon/update/[id]/route.ts (PUT method)
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Coupon } from "@/models/coupon.model";
import { User } from "@/models/user.model";
import mongoose from "mongoose";
import "@/models/category.model";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid coupon ID" },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Find coupon
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return NextResponse.json(
        { message: "Coupon not found" },
        { status: 404 }
      );
    }

    // Validate updates
    const updates: any = {};

    if (body.code !== undefined) {
      const code = body.code.toUpperCase();
      if (code !== coupon.code) {
        const existingCoupon = await Coupon.findOne({
          code,
          _id: { $ne: id },
        });
        if (existingCoupon) {
          return NextResponse.json(
            { message: "Coupon code already exists" },
            { status: 400 }
          );
        }
        updates.code = code;
      }
    }

    if (body.discountType !== undefined) {
      updates.discountType = body.discountType;
    }

    if (body.discountValue !== undefined) {
      if (body.discountValue <= 0) {
        return NextResponse.json(
          { message: "Discount value must be greater than 0" },
          { status: 400 }
        );
      }
      if (body.discountType === "PERCENTAGE" && body.discountValue > 100) {
        return NextResponse.json(
          { message: "Percentage discount cannot exceed 100%" },
          { status: 400 }
        );
      }
      updates.discountValue = body.discountValue;
    }

    if (body.maxDiscountAmount !== undefined) {
      updates.maxDiscountAmount = body.maxDiscountAmount;
    }

    if (body.minCartValue !== undefined) {
      updates.minCartValue = body.minCartValue;
    }

    if (body.startDate !== undefined) {
      const start = new Date(body.startDate);
      const end = body.endDate ? new Date(body.endDate) : coupon.endDate;

      if (start >= end) {
        return NextResponse.json(
          { message: "Start date must be before end date" },
          { status: 400 }
        );
      }
      updates.startDate = start;
    }

    if (body.endDate !== undefined) {
      const end = new Date(body.endDate);
      const start = body.startDate
        ? new Date(body.startDate)
        : coupon.startDate;

      if (end <= start) {
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
      updates.endDate = end;
    }

    if (body.usageLimit !== undefined) {
      updates.usageLimit = body.usageLimit;
    }

    if (body.usagePerUser !== undefined) {
      updates.usagePerUser = body.usagePerUser;
    }

    if (body.eventTag !== undefined) {
      updates.eventTag = body.eventTag;
    }

    if (body.applicableCategories !== undefined) {
      updates.applicableCategories = body.applicableCategories;
    }

    if (body.applicableProducts !== undefined) {
      updates.applicableProducts = body.applicableProducts;
    }

    if (body.isActive !== undefined) {
      updates.isActive = body.isActive;
    }

    // Update coupon
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: "Coupon updated successfully",
      coupon: updatedCoupon,
    });
  } catch (error: any) {
    console.error("Update coupon error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
