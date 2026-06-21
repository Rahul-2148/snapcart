import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb, { startDbSession } from "@/lib/server/db";
import mongoose from "mongoose";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { Order } from "@/models/order.model";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import Wallet from "@/models/wallet.model";
import WalletTransaction from "@/models/walletTransaction.model";
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
  if (!(await isDeliveryPartner(session))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { status } = await req.json();
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  await connectDb();
  const dbSession = await startDbSession();

  try {
    const assignment = await DeliveryAssignment.findOne({
      _id: id,
      assignedTo: session.user.id,
    }).session(dbSession);

    if (!assignment) {
      if (dbSession) {
        await dbSession.abortTransaction();
      }
      return NextResponse.json(
        { message: "Assignment not found" },
        { status: 404 },
      );
    }

    const order = await Order.findById(assignment.order).session(dbSession);
    if (!order) {
      if (dbSession) {
        await dbSession.abortTransaction();
      }
      return NextResponse.json({ message: "Order missing" }, { status: 404 });
    }

    const partner = await DeliveryPartner.findOne({
      user: session.user.id,
    }).session(dbSession);
    if (!partner) {
      if (dbSession) {
        await dbSession.abortTransaction();
      }
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

      // Handle Cash on Delivery (COD) collection
      if (order.paymentMethod === "cod") {
        partner.earnings.cashInHand = (partner.earnings.cashInHand || 0) + order.finalTotal;
        order.paymentStatus = "paid";
      }

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

      // Credit to Delivery Partner Wallet
      let riderWallet = await Wallet.findOne({ user: session.user.id }).session(dbSession);
      if (!riderWallet) {
        riderWallet = new Wallet({
          user: new mongoose.Types.ObjectId(session.user.id),
          role: "delivery-boy",
          balance: 0,
        });
      }
      riderWallet.balance += totalEarning;
      await riderWallet.save({ session: dbSession });

      // Create transaction record
      const transaction = new WalletTransaction({
        walletId: riderWallet._id,
        type: "credit",
        amount: totalEarning,
        description: `Order delivery payout (Order ID: ${order._id})`,
        status: "completed",
        referenceId: assignment._id.toString(),
      });
      await transaction.save({ session: dbSession });
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

    if (dbSession) {
      await dbSession.commitTransaction();
    }

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
    if (dbSession) {
      if (dbSession.inTransaction()) {
        await dbSession.abortTransaction();
      }
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  } finally {
    if (dbSession) {
      dbSession.endSession();
    }
  }
};
