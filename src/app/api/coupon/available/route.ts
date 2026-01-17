// src/app/api/coupon/available/route.ts (get all available coupons by user)
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Coupon } from "@/models/coupon.model";
import "@/models/category.model";

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const { cartTotal, userId, categoryIds, productIds } = await req.json();

    const now = new Date();

    // Build base query for active coupons (do not pre-filter by cart total so we can show coupons even if minCart not reached)
    const query: any = {
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    };

    // Get all available coupons
    const coupons = await Coupon.find(query)
      .sort({ discountValue: -1 })
      .populate("applicableCategories", "name")
      .populate("applicableProducts", "name");

    // Filter coupons based on applicability (strict mode)
    const applicableCoupons = coupons.filter((coupon) => {
      // Category restriction: coupon requires at least one matching category
      if (
        coupon.applicableCategories &&
        coupon.applicableCategories.length > 0
      ) {
        if (!categoryIds || categoryIds.length === 0) {
          return false;
        }

        const hasRequiredCategory = categoryIds.some((catId: string) =>
          coupon.applicableCategories.some(
            (cat: any) => cat._id.toString() === catId
          )
        );

        if (!hasRequiredCategory) {
          return false;
        }
      }

      // Product restriction: coupon requires at least one matching product
      if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
        if (!productIds || productIds.length === 0) {
          return false;
        }

        const hasRequiredProduct = productIds.some((prodId: string) =>
          coupon.applicableProducts.some(
            (prod: any) => prod._id.toString() === prodId
          )
        );

        if (!hasRequiredProduct) {
          return false;
        }
      }

      // Min cart check stays on client side; still return coupon here
      return true;
    });

    // Format response
    const formattedCoupons = applicableCoupons.map((coupon) => ({
      _id: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minCartValue: coupon.minCartValue || 0,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      eventTag: coupon.eventTag,
      description:
        coupon.discountType === "PERCENTAGE"
          ? `Get ${coupon.discountValue}% off${
              coupon.maxDiscountAmount
                ? ` (max ₹${coupon.maxDiscountAmount})`
                : ""
            }`
          : `Get ₹${coupon.discountValue} off`,
      applicableCategories: coupon.applicableCategories,
      applicableProducts: coupon.applicableProducts,
      daysLeft: Math.ceil(
        (coupon.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    return NextResponse.json({
      success: true,
      coupons: formattedCoupons,
      count: formattedCoupons.length,
    });
  } catch (error: any) {
    console.error("Available coupons error:", error);
    return NextResponse.json(
      { success: false, message: `Available coupons error: ${error.message}` },
      { status: 500 }
    );
  }
}
