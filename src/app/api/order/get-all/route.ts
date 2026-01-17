// src/app/api/order/get-all/route.ts (get all orders by user)
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { auth } from "@/auth";
import { User } from "@/models/user.model";
import { Order } from "@/models/order.model";
import "@/models/orderItem.model";

export const GET = async (_req: NextRequest) => {
  try {
    await connectDb();

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const orders = await Order.find({ userId: user._id })
      .populate("orderItems")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, orders }, { status: 200 });
  } catch (error) {
    console.error("Get Orders Error:", error);
    return NextResponse.json(
      { success: false, message: `Fetch orders error: ${error}` },
      { status: 500 }
    );
  }
};
