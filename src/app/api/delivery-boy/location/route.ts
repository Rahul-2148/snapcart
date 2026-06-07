import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { getIO } from "@/lib/server/socket";
import { isDeliveryPartner } from "@/lib/server/roles";

export const POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!(await isDeliveryPartner(session))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { lat, lng } = await req.json();
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ message: "lat and lng are required" }, { status: 400 });
  }

  await connectDb();
  const partner = await DeliveryPartner.findOne({ user: session.user.id });
  if (!partner) {
    return NextResponse.json({ message: "Delivery partner not found" }, { status: 404 });
  }

  partner.currentLocation = { lat, lng, updatedAt: new Date() } as any;
  await partner.save();

  const ioClient = getIO();
  ioClient?.emit("location_update", {
    userId: session.user.id,
    lat,
    lng,
    type: "delivery_boy",
  });

  if (partner.activeAssignment) {
    const assignment = await DeliveryAssignment.findById(
      partner.activeAssignment,
    )
      .select("order")
      .lean();
    if (assignment?.order) {
      ioClient?.emit("delivery_partner_location_updated", {
        orderId: assignment.order.toString(),
        partnerId: session.user.id,
        lat,
        lng,
        timestamp: new Date(),
      });
    }
  }

  return NextResponse.json({ success: true });
};
