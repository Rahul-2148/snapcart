import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { isDeliveryPartner } from "@/lib/server/roles";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import uploadOnCloudinary from "@/lib/server/cloudinary";

const ALLOWED_TYPES = [
  "aadhaar_front",
  "aadhaar_back",
  "pan",
  "license",
  "selfie",
] as const;

type AllowedType = (typeof ALLOWED_TYPES)[number];

const MAX_FILE_SIZE_MB = 5;

const isPdf = (file: File) => file.type === "application/pdf";
const isImage = (file: File) => file.type.startsWith("image/");

const normalizeAadhaar = (value: string) => value.replace(/\s+/g, "");

export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!(await isDeliveryPartner(session))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDb();
  const partner = await DeliveryPartner.findOne({ user: session.user.id })
    .select("kyc")
    .lean();

  if (!partner) {
    return NextResponse.json({ message: "Partner profile missing" }, { status: 404 });
  }

  return NextResponse.json({ success: true, kyc: partner.kyc || { status: "not_submitted", documents: [] } });
};

export const POST = async (req: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!(await isDeliveryPartner(session))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDb();
  const partner = await DeliveryPartner.findOne({ user: session.user.id });
  if (!partner) {
    return NextResponse.json({ message: "Partner profile missing" }, { status: 404 });
  }

  const currentStatus = partner.kyc?.status || "not_submitted";
  if (currentStatus === "pending") {
    return NextResponse.json({ message: "KYC is already under review" }, { status: 400 });
  }
  if (currentStatus === "approved") {
    return NextResponse.json({ message: "KYC already approved" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const formData = await req.formData();

  const aadhaarNumber = (formData.get("aadhaarNumber") as string) || "";
  const panNumber = (formData.get("panNumber") as string) || "";
  const licenseNumber = (formData.get("licenseNumber") as string) || "";

  const cleanedAadhaar = normalizeAadhaar(aadhaarNumber);
  if (cleanedAadhaar && !/^\d{12}$/.test(cleanedAadhaar)) {
    return NextResponse.json({ message: "Invalid Aadhaar number" }, { status: 400 });
  }

  if (panNumber && !/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber.toUpperCase())) {
    return NextResponse.json({ message: "Invalid PAN number" }, { status: 400 });
  }

  if (licenseNumber && !/^[A-Z0-9-]{5,20}$/i.test(licenseNumber)) {
    return NextResponse.json({ message: "Invalid license number" }, { status: 400 });
  }

  const documents: Array<{
    type: AllowedType;
    url: string;
    publicId: string;
    uploadedAt: Date;
  }> = [];

  for (const type of ALLOWED_TYPES) {
    const file = formData.get(type) as File | null;
    if (file) {
      if (!isImage(file) && !isPdf(file)) {
        return NextResponse.json({ message: "Only image or PDF files are allowed" }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return NextResponse.json({ message: "File size must be under 5MB" }, { status: 400 });
      }
      const uploaded = await uploadOnCloudinary(
        file,
        "Snapcart_Grocery_Single-vendor/kyc",
        isPdf(file) ? "raw" : "image",
      );
      if (uploaded) {
        documents.push({
          type,
          url: uploaded.url,
          publicId: uploaded.publicId,
          uploadedAt: new Date(),
        });
      }
    }
  }

  if (documents.length === 0) {
    return NextResponse.json({ message: "Please upload at least one document" }, { status: 400 });
  }

  partner.kyc = {
    status: "pending",
    documents,
    submittedAt: new Date(),
    reviewedAt: undefined,
    reviewedBy: undefined,
    rejectionReason: undefined,
    aadhaarNumber: cleanedAadhaar || undefined,
    panNumber: panNumber ? panNumber.toUpperCase() : undefined,
    licenseNumber: licenseNumber || undefined,
  };

  await partner.save();

  return NextResponse.json({ success: true, kyc: partner.kyc });
};
