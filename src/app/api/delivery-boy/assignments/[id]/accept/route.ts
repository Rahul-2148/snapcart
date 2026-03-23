import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import mongoose from "mongoose";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { Order } from "@/models/order.model";
import { getIO } from "@/lib/server/socket";
import { isDeliveryPartner } from "@/lib/server/roles";

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

  await connectDb();
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const partner = await DeliveryPartner.findOne({
      user: session.user.id,
    }).session(dbSession);
    if (!partner) {
      await dbSession.abortTransaction();
      return NextResponse.json(
        { message: "Partner profile missing" },
        { status: 404 },
      );
    }

    if (!partner.isOnline) {
      await dbSession.abortTransaction();
      return NextResponse.json(
        { message: "Go online to accept orders" },
        { status: 400 },
      );
    }

    const assignment = await DeliveryAssignment.findOneAndUpdate(
      {
        _id: id,
        status: "broadcasted",
        assignedTo: null,
        broadcastedTo: { $in: [partner.user] },
        declinedBy: { $nin: [partner.user] },
      },
      {
        $set: {
          assignedTo: partner.user,
          status: "assigned",
          acceptedAt: new Date(),
        },
        $push: {
          timeline: {
            status: "assigned",
            timestamp: new Date(),
            note: "Accepted by delivery partner",
          },
        },
      },
      { new: true, session: dbSession },
    );

    if (!assignment) {
      await dbSession.abortTransaction();
      return NextResponse.json(
        { message: "Assignment already taken" },
        { status: 409 },
      );
    }

    partner.activeAssignment = assignment._id;
    await partner.save({ session: dbSession });

    await Order.findByIdAndUpdate(
      assignment.order,
      {
        assignedDeliveryPartner: partner.user,
        assignment: assignment._id,
      },
      { session: dbSession },
    );

    await dbSession.commitTransaction();

    const ioClient = getIO();
    ioClient?.emit("delivery_request_accepted", {
      assignmentId: assignment._id.toString(),
      deliveryPartnerId: partner.user.toString(),
      orderNumber: assignment.orderNumber,
    });

    return NextResponse.json({ success: true, assignment });
  } catch (error: any) {
    if (dbSession.inTransaction()) {
      await dbSession.abortTransaction();
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  } finally {
    dbSession.endSession();
  }
};
