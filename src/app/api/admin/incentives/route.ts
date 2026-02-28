import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryIncentive } from "@/models/deliveryIncentive.model";

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }
  // @ts-ignore
  if (session.user.currentRole !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true } as const;
};

export const GET = async () => {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  await connectDb();
  const incentives = await DeliveryIncentive.find().sort({ endAt: -1 }).lean();
  return NextResponse.json({ success: true, incentives });
};

export const POST = async (req: NextRequest) => {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const {
    title,
    description,
    targetDeliveries,
    targetEarnings,
    rewardAmount,
    startAt,
    endAt,
    isActive,
  } = body || {};

  if (!title || !rewardAmount || !startAt || !endAt) {
    return NextResponse.json(
      { message: "title, rewardAmount, startAt, endAt are required" },
      { status: 400 },
    );
  }

  await connectDb();
  const incentive = await DeliveryIncentive.create({
    title,
    description,
    targetDeliveries: targetDeliveries || undefined,
    targetEarnings: targetEarnings || undefined,
    rewardAmount,
    startAt: new Date(startAt),
    endAt: new Date(endAt),
    isActive: isActive !== false,
  });

  return NextResponse.json({ success: true, incentive });
};

export const PUT = async (req: NextRequest) => {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const { id, ...updates } = body || {};
  if (!id)
    return NextResponse.json({ message: "id is required" }, { status: 400 });

  await connectDb();
  const incentive = await DeliveryIncentive.findByIdAndUpdate(
    id,
    {
      ...updates,
      ...(updates.startAt ? { startAt: new Date(updates.startAt) } : {}),
      ...(updates.endAt ? { endAt: new Date(updates.endAt) } : {}),
    },
    { new: true },
  );

  if (!incentive)
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, incentive });
};

export const DELETE = async (req: NextRequest) => {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ message: "id is required" }, { status: 400 });

  await connectDb();
  await DeliveryIncentive.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
};
