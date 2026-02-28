import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryShift } from "@/models/deliveryShift.model";
import { isDeliveryPartner } from "@/lib/server/roles";

const toDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isDeliveryPartner(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDb();
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const shifts = await DeliveryShift.find({
    partner: session.user.id,
    endAt: { $gte: from },
  })
    .sort({ startAt: 1 })
    .lean();

  return NextResponse.json({ success: true, shifts });
};

export const POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isDeliveryPartner(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { startAt, endAt } = await req.json();
  const startDate = toDate(startAt);
  const endDate = toDate(endAt);

  if (!startDate || !endDate) {
    return NextResponse.json(
      { message: "startAt and endAt are required" },
      { status: 400 },
    );
  }
  if (endDate <= startDate) {
    return NextResponse.json(
      { message: "endAt must be after startAt" },
      { status: 400 },
    );
  }

  await connectDb();

  const overlap = await DeliveryShift.findOne({
    partner: session.user.id,
    status: { $in: ["scheduled", "active"] },
    $or: [
      { startAt: { $lte: endDate }, endAt: { $gte: startDate } },
    ],
  }).lean();

  if (overlap) {
    return NextResponse.json(
      { message: "Shift overlaps with an existing shift" },
      { status: 409 },
    );
  }

  const shift = await DeliveryShift.create({
    partner: session.user.id,
    startAt: startDate,
    endAt: endDate,
    status: "scheduled",
  });

  return NextResponse.json({ success: true, shift });
};

export const PATCH = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isDeliveryPartner(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { shiftId, action } = await req.json();
  if (!shiftId || !action) {
    return NextResponse.json({ message: "shiftId and action are required" }, { status: 400 });
  }

  await connectDb();
  const shift = await DeliveryShift.findOne({ _id: shiftId, partner: session.user.id });
  if (!shift) {
    return NextResponse.json({ message: "Shift not found" }, { status: 404 });
  }

  const now = new Date();
  const earlyStartMinutes = Number(process.env.SHIFT_EARLY_START_MINUTES || 15);
  const earlyWindowStart = new Date(shift.startAt.getTime() - earlyStartMinutes * 60 * 1000);
  if (action === "start") {
    if (now > shift.endAt) {
      return NextResponse.json({ message: "Shift already ended" }, { status: 400 });
    }
    if (now < earlyWindowStart) {
      return NextResponse.json(
        { message: "Shift not in active window" },
        { status: 400 },
      );
    }
    shift.status = "active";
  } else if (action === "end") {
    shift.status = "completed";
  } else if (action === "cancel") {
    if (shift.status === "completed") {
      return NextResponse.json(
        { message: "Completed shift cannot be cancelled" },
        { status: 400 },
      );
    }
    shift.status = "cancelled";
  } else {
    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  }

  await shift.save();
  return NextResponse.json({ success: true, shift });
};
