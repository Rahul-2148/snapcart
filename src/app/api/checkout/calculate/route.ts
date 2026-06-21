// src/app/api/checkout/calculate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { calculateCheckoutPricing } from "@/lib/server/pricing";

export const POST = async (req: NextRequest) => {
  try {
    await connectDb();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { deliveryAddress, paymentMethod, useWallet } = await req.json();

    if (!deliveryAddress) {
      return NextResponse.json(
        { message: "deliveryAddress is required" },
        { status: 400 }
      );
    }

    const pricing = await calculateCheckoutPricing({
      userId: session.user.id,
      deliveryAddress,
      paymentMethod: paymentMethod || "cod",
      useWallet: !!useWallet,
    });

    return NextResponse.json({
      success: true,
      pricing,
    });
  } catch (error: any) {
    console.error("Calculate pricing error:", error);
    return NextResponse.json(
      { message: `Failed to calculate pricing: ${error.message}` },
      { status: 500 }
    );
  }
};
