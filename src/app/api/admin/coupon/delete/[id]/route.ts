// src/app/api/admin/coupon/delete/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Coupon } from "@/models/coupon.model";
import { User } from "@/models/user.model";
import { CouponUsage } from "@/models/couponUsage.model";
import mongoose from "mongoose";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Check if coupon has been used
    const usageCount = await CouponUsage.countDocuments({ coupon: id });
    if (usageCount > 0) {
      // Soft delete - just deactivate
      await Coupon.findByIdAndUpdate(id, { isActive: false });
      return NextResponse.json({
        success: true,
        message: "Coupon deactivated (has been used)",
        softDelete: true,
      });
    }

    // Hard delete - if never used
    await Coupon.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete coupon error:", error);
    return NextResponse.json(
      { success: false, message: `Error deleting coupon: ${error.message}` },
      { status: 500 }
    );
  }
}
