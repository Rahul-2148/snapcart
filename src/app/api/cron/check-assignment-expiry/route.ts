import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { broadcastOrderToPartners } from "@/lib/server/delivery";

// This endpoint should be called by a cron job every minute
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    // Find all broadcasted assignments that have expired
    const expiredAssignments = await DeliveryAssignment.find({
      status: "broadcasted",
      expiresAt: { $lt: new Date() },
    });

    console.log(`Found ${expiredAssignments.length} expired broadcasts`);

    let rebroadcastCount = 0;

    for (const assignment of expiredAssignments) {
      // Check if this is the first broadcast or a re-broadcast
      const broadcastCount = assignment.timeline.filter(
        (t: any) => t.status === "broadcasted",
      ).length;

      if (broadcastCount < 3) {
        // Re-broadcast up to 3 times
        try {
          await broadcastOrderToPartners(assignment._id.toString());
          rebroadcastCount++;

          assignment.timeline.push({
            status: "broadcasted",
            timestamp: new Date(),
            note: `Re-broadcast #${broadcastCount + 1} - Expanding delivery radius`,
          });
          await assignment.save();
        } catch (error) {
          console.error(
            `Failed to re-broadcast assignment ${assignment._id}`,
            error,
          );
        }
      } else {
        // Mark as failed after 3 re-broadcasts
        assignment.status = "cancelled";
        assignment.reasonForCancellation =
          "No delivery partner accepted within 3 broadcast attempts";
        assignment.cancelledAt = new Date();
        assignment.timeline.push({
          status: "cancelled",
          timestamp: new Date(),
          note: "Order cancelled - no partner available",
        });
        await assignment.save();
        console.log(
          `Order ${assignment.orderNumber} cancelled - no partners available`,
        );
      }
    }

    return NextResponse.json({
      message: "Expiry check completed",
      expiredCount: expiredAssignments.length,
      rebroadcastCount,
    });
  } catch (error) {
    console.error("[Expiry Cron Error]", error);
    return NextResponse.json(
      { error: "Failed to process expiry" },
      { status: 500 },
    );
  }
}
