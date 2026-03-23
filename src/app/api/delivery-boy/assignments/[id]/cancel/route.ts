import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import mongoose from "mongoose";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { Order } from "@/models/order.model";
import { broadcastOrderToPartners } from "@/lib/server/delivery";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { isDeliveryPartner } from "@/lib/server/roles";

const CANCELLATION_PENALTY = 50; // ₹50 penalty per cancellation
const CONSECUTIVE_CANCELLATION_LIMIT = 3; // Suspend after 3 cancellations in a row
const SUSPENSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isDeliveryPartner(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { reason } = await req.json();

  await connectDb();
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const assignment = await DeliveryAssignment.findOne({
      _id: id,
      assignedTo: session.user.id,
    }).session(dbSession);

    if (!assignment) {
      await dbSession.abortTransaction();
      return NextResponse.json(
        { message: "Assignment not found" },
        { status: 404 },
      );
    }

    // Can only cancel if in assigned or picked_up status
    if (!["assigned", "picked_up"].includes(assignment.status)) {
      await dbSession.abortTransaction();
      return NextResponse.json(
        { message: "Cannot cancel delivery in current status" },
        { status: 400 },
      );
    }

    const partner = await DeliveryPartner.findOne({
      user: session.user.id,
    }).session(dbSession);
    if (!partner) {
      await dbSession.abortTransaction();
      return NextResponse.json(
        { message: "Partner not found" },
        { status: 404 },
      );
    }

    // Apply penalty
    const penaltyAmount = CANCELLATION_PENALTY;
    partner.earnings.pendingPayout = Math.max(
      0,
      partner.earnings.pendingPayout - penaltyAmount,
    );
    partner.stats.cancelledDeliveries =
      (partner.stats.cancelledDeliveries || 0) + 1;

    // Update consecutive cancellations
    partner.consecutiveCancellations =
      (partner.consecutiveCancellations || 0) + 1;
    partner.lastCancellationAt = new Date();

    // Check if should suspend
    if (
      (partner.consecutiveCancellations || 0) >= CONSECUTIVE_CANCELLATION_LIMIT
    ) {
      partner.isSuspended = true;
      partner.suspendedUntil = new Date(Date.now() + SUSPENSION_DURATION_MS);
    }

    // Update acceptance rate
    const totalDeliveries =
      (partner.stats?.totalDeliveries || 0) +
      (partner.stats?.cancelledDeliveries || 0);
    partner.stats.acceptanceRate =
      totalDeliveries > 0
        ? ((totalDeliveries - (partner.stats?.cancelledDeliveries || 0)) /
            totalDeliveries) *
          100
        : 0;

    assignment.status = "broadcasted";
    assignment.assignedTo = null;
    assignment.acceptedAt = null;
    assignment.pickedUpAt = null;
    assignment.deliveredAt = null;
    assignment.cancelledAt = new Date();
    assignment.reasonForCancellation = reason || "Cancelled by partner";
    assignment.partnerCancellationCount =
      (assignment.partnerCancellationCount || 0) + 1;
    assignment.timeline.push({
      status: "cancelled_by_partner",
      timestamp: new Date(),
      note: `${assignment.reasonForCancellation} (Penalty: ₹${penaltyAmount})`,
    });
    await assignment.save({ session: dbSession });

    await Order.findByIdAndUpdate(
      assignment.order,
      { assignedDeliveryPartner: null },
      { session: dbSession },
    );

    partner.activeAssignment = null;
    await partner.save({ session: dbSession });

    await dbSession.commitTransaction();

    // Re-broadcast order
    await broadcastOrderToPartners(assignment._id.toString());

    return NextResponse.json({
      success: true,
      message: `Delivery cancelled. Penalty: ₹${penaltyAmount}`,
      partner: {
        suspended: partner.isSuspended,
        suspendedUntil: partner.suspendedUntil,
        consecutiveCancellations: partner.consecutiveCancellations,
      },
    });
  } catch (error: any) {
    if (dbSession.inTransaction()) {
      await dbSession.abortTransaction();
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  } finally {
    dbSession.endSession();
  }
};
