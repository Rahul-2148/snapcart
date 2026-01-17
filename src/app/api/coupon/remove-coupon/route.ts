// src/app/api/coupon/remove-coupon/route.ts
import { NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { Cart } from "@/models/cart.model";

export async function DELETE() {
  try {
    await connectDb();
    const session = await auth();

    if (!session?.user?.id)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await Cart.updateOne({ user: session.user.id }, { $unset: { coupon: "" } });

    return NextResponse.json({
      success: true,
      message: "Coupon removed",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: `remove-coupon error: ${error.message}` },
      { status: 500 }
    );
  }
}
