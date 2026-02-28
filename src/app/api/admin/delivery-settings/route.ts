import { NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { DeliverySettings } from "@/models/deliverySettings.model";

export const GET = async () => {
  await connectDb();
  let settings = await DeliverySettings.findOne();

  if (!settings) {
    settings = await DeliverySettings.create({
      storeLocation: {
        address: "SnapCart Grocery Store",
        lat: 28.6139,
        lng: 77.209,
        pincode: "110001",
        city: "New Delhi",
      },
      serviceRadiusKm: 7,
      broadcastBatchSize: 10,
      assignmentExpiryMinutes: 6,
      basePayPerKm: 10,
      basePayFlat: 20,
      maxParallelAssignmentsPerPartner: 2,
      allowGenderFilter: false,
      kycRequiredForOnline: false,
    });
  }

  return NextResponse.json({ success: true, settings });
};

export const PUT = async (req: Request) => {
  await connectDb();
  const updates = await req.json();

  const settings = await DeliverySettings.findOneAndUpdate({}, updates, {
    new: true,
    upsert: true,
  });

  return NextResponse.json({ success: true, settings });
};
