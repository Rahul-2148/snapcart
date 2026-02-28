import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { PaymentSession } from "@/models/paymentSession.model";

// This endpoint should be called by a cron job every 5-10 minutes
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const expiryMinutes = Number(
      process.env.PENDING_ORDER_EXPIRY_MINUTES || 30
    );
    const cutoff = new Date(Date.now() - expiryMinutes * 60 * 1000);

    const pendingSessions = await PaymentSession.find({
      status: "pending",
      createdAt: { $lt: cutoff },
    }).select("_id userId");

    if (pendingSessions.length === 0) {
      return NextResponse.json({
        message: "No pending payment sessions to clean up",
        cleaned: 0,
      });
    }

    const sessionIds = pendingSessions.map((s) => s._id);

    await PaymentSession.updateMany(
      { _id: { $in: sessionIds } },
      { $set: { status: "expired" } }
    );

    return NextResponse.json({
      message: "Expired pending payment sessions",
      cleaned: sessionIds.length,
    });
  } catch (error) {
    console.error("[Pending Orders Cleanup Error]", error);
    return NextResponse.json(
      { error: "Failed to clean pending orders" },
      { status: 500 }
    );
  }
}
