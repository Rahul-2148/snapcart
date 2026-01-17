import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Coupon } from "@/models/coupon.model";
import { auth } from "@/auth";
import "@/models/category.model";
import "@/models/grocery.model";

// GET all coupons
export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const query: any = {};

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { eventTag: { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
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
    }

    const coupons = await Coupon.find(query)
      .populate("applicableCategories", "name")
      .populate("applicableProducts", "name")
      .sort({ createdAt: -1 });

    const totalCoupons = await Coupon.countDocuments(query);

    return NextResponse.json({ success: true, coupons, totalCoupons });
  } catch (error: any) {
    console.error("GET coupons error:", error);
    return NextResponse.json(
      { success: false, message: `Failed to fetch coupons: ${error.message}` },
      { status: 500 }
    );
  }
}

// POST a new coupon
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDb();
    const body = await req.json();

    const newCoupon = new Coupon(body);
    await newCoupon.save();

    return NextResponse.json(
      { success: true, coupon: newCoupon },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST coupon error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create coupon" },
      { status: 500 }
    );
  }
}
