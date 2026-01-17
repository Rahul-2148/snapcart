import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Coupon } from "@/models/coupon.model";
import { auth } from "@/auth";
import mongoose from "mongoose";

// GET a specific coupon
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: `Invalid coupon ID: ${id}` },
        { status: 400 }
      );
    }

    await connectDb();
    const coupon = await Coupon.findById(id)
      .populate("applicableCategories", "name")
      .populate("applicableProducts", "name");

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: "Coupon not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, coupon });
  } catch (error: any) {
    console.error(`GET coupon ${id} error:`, error);
    return NextResponse.json(
      { success: false, message: `Failed to fetch coupon: ${error.message}` },
      { status: 500 }
    );
  }
}

// PUT (update) a specific coupon
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: `Invalid coupon ID: ${id}` },
        { status: 400 }
      );
    }

    await connectDb();
    const body = await req.json();

    const updatedCoupon = await Coupon.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedCoupon) {
      return NextResponse.json(
        { success: false, message: "Coupon not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, coupon: updatedCoupon });
  } catch (error: any) {
    console.error(`PUT coupon ${id} error:`, error);
    return NextResponse.json(
      { success: false, message: `Failed to update coupon: ${error.message}` },
      { status: 500 }
    );
  }
}

// DELETE a specific coupon
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: `Invalid coupon ID: ${id}` },
        { status: 400 }
      );
    }

    await connectDb();

    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    if (!deletedCoupon) {
      return NextResponse.json(
        { success: false, message: "Coupon not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error: any) {
    console.error(`DELETE coupon ${id} error:`, error);
    return NextResponse.json(
      { success: false, message: `Failed to delete coupon: ${error.message}` },
      { status: 500 }
    );
  }
}
