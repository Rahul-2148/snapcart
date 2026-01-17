// src/app/api/admin/coupon/export/route.ts
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
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status"); // all, active, expired, upcoming, inactive

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { eventTag: { $regex: search, $options: "i" } },
      ];
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
    // For "all", no additional filter

    // Get all coupons without pagination
    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .populate("applicableCategories", "name")
      .populate("applicableProducts", "name");

    // CSV Headers
    const headers = [
      "Code",
      "Discount Type",
      "Discount Value",
      "Max Discount Amount",
      "Min Cart Value",
      "Start Date",
      "End Date",
      "Usage Limit",
      "Usage Per User",
      "Event Tag",
      "Is Active",
      "Status",
      "Applicable Categories",
      "Applicable Products",
      "Created By",
      "Created At",
      "Updated At",
    ];

    // Build CSV rows
    const rows = coupons.map((coupon) => {
      const status =
        coupon.endDate < now
          ? "expired"
          : coupon.startDate > now
          ? "upcoming"
          : coupon.isActive
          ? "active"
          : "inactive";

      const applicableCategories = coupon.applicableCategories
        ?.map((cat: any) => cat.name)
        .join("; ") || "";

      const applicableProducts = coupon.applicableProducts
        ?.map((prod: any) => prod.name)
        .join("; ") || "";

      const createdBy = (coupon.createdBy as any)?.name || "";

      return [
        coupon.code,
        coupon.discountType,
        coupon.discountValue,
        coupon.maxDiscountAmount || "",
        coupon.minCartValue || "",
        coupon.startDate.toISOString().split("T")[0],
        coupon.endDate.toISOString().split("T")[0],
        coupon.usageLimit || "",
        coupon.usagePerUser || "",
        coupon.eventTag || "",
        coupon.isActive,
        status,
        applicableCategories,
        applicableProducts,
        createdBy,
        coupon.createdAt?.toISOString().split("T")[0] || "",
        coupon.updatedAt?.toISOString().split("T")[0] || "",
      ];
    });

    // Create CSV content with BOM for proper Excel opening
    const csvContent = "\ufeff" + [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Return CSV as response
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="coupons_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export coupons error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}