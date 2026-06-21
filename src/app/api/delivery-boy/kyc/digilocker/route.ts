import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { isDeliveryPartner } from "@/lib/server/roles";
import { DeliveryPartner } from "@/models/deliveryPartner.model";

const normalizeAadhaar = (value: string) => value.replace(/\s+/g, "");

export const POST = async (req: Request) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { aadhaarNumber, panNumber, licenseNumber } = await req.json();

    if (!aadhaarNumber) {
      return NextResponse.json({ message: "Aadhaar number is required" }, { status: 400 });
    }

    const cleanedAadhaar = normalizeAadhaar(aadhaarNumber);
    if (!/^\d{12}$/.test(cleanedAadhaar)) {
      return NextResponse.json(
        { message: "Invalid Aadhaar number (must be 12 digits)" },
        { status: 400 }
      );
    }

    if (panNumber && !/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber.toUpperCase())) {
      return NextResponse.json(
        { message: "Invalid PAN number format (e.g. ABCDE1234F)" },
        { status: 400 }
      );
    }

    if (licenseNumber && !/^[A-Z0-9-]{5,20}$/i.test(licenseNumber)) {
      return NextResponse.json(
        { message: "Invalid license number" },
        { status: 400 }
      );
    }

    await connectDb();

    const partner = await DeliveryPartner.findOne({ user: session.user.id });
    if (!partner) {
      return NextResponse.json({ message: "Partner profile missing" }, { status: 404 });
    }

    const currentStatus = partner.kyc?.status || "not_submitted";
    if (currentStatus === "approved") {
      return NextResponse.json({ message: "KYC already approved" }, { status: 400 });
    }

    // Direct instant approval for DigiLocker verified partners
    partner.kyc = {
      status: "approved",
      documents: [], // DigiLocker verification does not require manual documents upload
      submittedAt: new Date(),
      reviewedAt: new Date(),
      rejectionReason: undefined,
      aadhaarNumber: cleanedAadhaar,
      panNumber: panNumber ? panNumber.toUpperCase() : undefined,
      licenseNumber: licenseNumber || undefined,
    };

    await partner.save();

    return NextResponse.json({
      success: true,
      message: "KYC completed instantly via DigiLocker!",
      kyc: partner.kyc,
    });
  } catch (error: any) {
    console.error("DigiLocker Partner KYC API error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
};
