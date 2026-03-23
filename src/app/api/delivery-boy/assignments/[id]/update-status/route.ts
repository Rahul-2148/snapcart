import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import mongoose from "mongoose";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { Order } from "@/models/order.model";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import {
  getOrCreateDeliverySettings,
  computePayout,
  calculateSurgeFactor,
} from "@/lib/server/delivery";
import { getIO } from "@/lib/server/socket";
import { isDeliveryPartner } from "@/lib/server/roles";

const ALLOWED_STATUSES = ["picked_up", "on_the_way", "delivered"] as const;

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

  const { status } = await req.json();
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

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

    const order = await Order.findById(assignment.order).session(dbSession);
    if (!order) {
      await dbSession.abortTransaction();
      return NextResponse.json({ message: "Order missing" }, { status: 404 });
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

    const now = new Date();
    if (status === "picked_up") {
      assignment.status = "picked_up";
      assignment.pickedUpAt = now;
      order.orderStatus = "out-for-delivery";
      order.outForDeliveryAt = now;
    }

    if (status === "on_the_way") {
      assignment.status = "on_the_way";
    }

    if (status === "delivered") {
      assignment.status = "delivered";
      assignment.deliveredAt = now;
      order.orderStatus = "delivered";
      order.deliveredAt = now;

      // Earnings credit with surge pricing
      const settings = await getOrCreateDeliverySettings();
      const surgeFactor = calculateSurgeFactor();
      const basePayout = computePayout(
        assignment.estimatedDistance,
        settings,
        1,
      );
      const surgeEarning = Math.round(basePayout * (surgeFactor - 1));
      const totalEarning = computePayout(
        assignment.estimatedDistance,
        settings,
        surgeFactor,
      );

      partner.earnings.total += totalEarning;
      partner.earnings.pendingPayout += totalEarning;
      partner.earnings.currentSession += totalEarning;
      if (surgeFactor > 1) {
        partner.earnings.surgeEarnings =
          (partner.earnings.surgeEarnings || 0) + surgeEarning;
      }
      partner.stats.totalDeliveries += 1;

      // Reset consecutive cancellations on successful delivery
      partner.consecutiveCancellations = 0;

      // Calculate acceptance rate
      const totalAttempts =
        (partner.stats?.totalDeliveries || 0) +
        (partner.stats?.cancelledDeliveries || 0);
      partner.stats.acceptanceRate =
        totalAttempts > 0
          ? ((partner.stats?.totalDeliveries || 0) / totalAttempts) * 100
          : 0;

      partner.activeAssignment = null;

      assignment.rewardAmount = totalEarning;
    }

    assignment.timeline.push({
      status,
      timestamp: now,
      note:
        status === "delivered" && assignment.rewardAmount
          ? `Earned ₹${assignment.rewardAmount}`
          : undefined,
    });

    await assignment.save({ session: dbSession });
    await order.save({ session: dbSession });
    await partner.save({ session: dbSession });

    await dbSession.commitTransaction();

    const ioClient = getIO();
    ioClient?.emit("delivery_status_update", {
      orderId: order._id.toString(),
      status,
      customerId: order.userId?.toString?.(),
      assignmentId: assignment._id.toString(),
      location: partner.currentLocation,
      earning: assignment.rewardAmount,
    });

    return NextResponse.json({
      success: true,
      assignment,
      earning: assignment.rewardAmount,
      surgeFactor: status === "delivered" ? calculateSurgeFactor() : undefined,
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
