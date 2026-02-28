import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { DeliveryShift } from "@/models/deliveryShift.model";
import { getOrCreateDeliverySettings } from "@/lib/server/delivery";
import { getIO } from "@/lib/server/socket";
import { isDeliveryPartner } from "@/lib/server/roles";

const ensurePartner = async (userId: string) => {
  await connectDb();
  let partner = await DeliveryPartner.findOne({ user: userId });
  if (!partner) {
    const settings = await getOrCreateDeliverySettings();
    partner = await DeliveryPartner.create({
      user: userId,
      isOnline: false,
      serviceRadiusKm: settings.serviceRadiusKm,
    });
  }
  return partner;
};

export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isDeliveryPartner(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const partner = await ensurePartner(session.user.id);
  return NextResponse.json({
    success: true,
    status: {
      isOnline: partner.isOnline,
      currentLocation: partner.currentLocation,
      serviceRadiusKm: partner.serviceRadiusKm,
      stats: partner.stats,
    },
  });
};

export const PUT = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isDeliveryPartner(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { isOnline, location, gender } = await req.json();
  if (typeof isOnline !== "boolean") {
    return NextResponse.json(
      { message: "isOnline flag required" },
      { status: 400 },
    );
  }

  const partner = await ensurePartner(session.user.id);
  const settings = await getOrCreateDeliverySettings();
  if (isOnline && settings.kycRequiredForOnline) {
    const kycStatus = partner.kyc?.status || "not_submitted";
    if (kycStatus !== "approved") {
      return NextResponse.json(
        { message: "KYC approval required to go online" },
        { status: 400 },
      );
    }
  }
  partner.isOnline = isOnline;

  if (gender && ["male", "female", "other"].includes(gender)) {
    partner.gender = gender;
  }

  const availability = partner.availability || {};
  if (isOnline) {
    const now = new Date();
    const activeShift = await DeliveryShift.findOne({
      partner: session.user.id,
      startAt: { $lte: now },
      endAt: { $gte: now },
      status: { $in: ["scheduled", "active"] },
    });

    if (!activeShift) {
      return NextResponse.json(
        { message: "No active shift. Please start a shift to go online." },
        { status: 400 },
      );
    }

    if (activeShift.status !== "active") {
      activeShift.status = "active";
      await activeShift.save();
    }

    availability.lastOnlineAt = new Date();
    if (location?.lat && location?.lng) {
      partner.currentLocation = {
        lat: location.lat,
        lng: location.lng,
        updatedAt: new Date(),
      };
    } else {
      return NextResponse.json(
        { message: "Location (lat/lng) required when going online" },
        { status: 400 },
      );
    }
  } else {
    availability.lastOfflineAt = new Date();
    partner.activeAssignment = null;
  }
  partner.availability = availability as any;
  await partner.save();

  const ioClient = getIO();
  if (isOnline) {
    ioClient?.emit("delivery_partner_online", {
      partnerId: session.user.id,
      location: partner.currentLocation,
      gender: partner.gender,
    });
  }

  return NextResponse.json({
    success: true,
    status: {
      isOnline: partner.isOnline,
      currentLocation: partner.currentLocation,
      gender: partner.gender,
    },
  });
};
