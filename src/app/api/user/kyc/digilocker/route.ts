import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";

const normalizeAadhaar = (value: string) => value.replace(/\s+/g, "");

export const POST = async (req: Request) => {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { aadhaarNumber, panNumber } = await req.json();

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

    await connectDb();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const currentStatus = user.kyc?.status || "not_submitted";
    if (currentStatus === "approved") {
      return NextResponse.json({ message: "KYC already approved" }, { status: 400 });
    }

    // Direct instant approval for DigiLocker verified users
    user.kyc = {
      status: "approved",
      documents: [], // DigiLocker verification does not require manual documents upload
      submittedAt: new Date(),
      reviewedAt: new Date(),
      rejectionReason: undefined,
      aadhaarNumber: cleanedAadhaar,
      panNumber: panNumber ? panNumber.toUpperCase() : undefined,
      verificationType: "digilocker",
    };

    await user.save();

    return NextResponse.json({
      success: true,
      message: "KYC completed instantly via DigiLocker!",
      kyc: user.kyc,
    });
  } catch (error: any) {
    console.error("DigiLocker KYC API error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
};
