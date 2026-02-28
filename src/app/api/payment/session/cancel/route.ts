import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { PaymentSession } from "@/models/paymentSession.model";

export const POST = async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { paymentSessionId } = await req.json();
    if (!paymentSessionId) {
      return NextResponse.json(
        { message: "paymentSessionId is required" },
        { status: 400 }
      );
    }

    await connectDb();

    const paymentSession = await PaymentSession.findById(paymentSessionId);
    if (!paymentSession) {
      return NextResponse.json({ message: "Payment session not found" }, { status: 404 });
    }

    if (paymentSession.userId.toString() !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (paymentSession.status !== "pending") {
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    paymentSession.status = "cancelled";
    await paymentSession.save();

    return NextResponse.json({ success: true, message: "Payment session cancelled" });
  } catch (error: any) {
    console.error("Cancel payment session error:", error);
    return NextResponse.json(
      { message: `Failed to cancel payment session: ${error.message}` },
      { status: 500 }
    );
  }
};
