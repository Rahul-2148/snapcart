import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { PaymentSession } from "@/models/paymentSession.model";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Session ID is required" }, { status: 400 });
    }

    await connectDb();

    const paymentSession = await PaymentSession.findById(id).populate({
      path: "items.groceryId",
      select: "images",
    });
    if (!paymentSession) {
      return NextResponse.json({ message: "Payment session not found" }, { status: 404 });
    }

    if (paymentSession.userId.toString() !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, session: paymentSession });
  } catch (error: any) {
    console.error("Get payment session error:", error);
    return NextResponse.json(
      { message: `Failed to get payment session: ${error.message}` },
      { status: 500 }
    );
  }
};
