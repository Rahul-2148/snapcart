import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import uploadOnCloudinary from "@/lib/server/cloudinary";

const ALLOWED_TYPES = [
  "aadhaar_front",
  "aadhaar_back",
  "pan",
  "selfie",
] as const;

type AllowedType = (typeof ALLOWED_TYPES)[number];

const MAX_FILE_SIZE_MB = 5;

const isPdf = (file: File) => file.type === "application/pdf";
const isImage = (file: File) => file.type.startsWith("image/");

const normalizeAadhaar = (value: string) => value.replace(/\s+/g, "");

export const GET = async () => {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const user = await User.findOne({ email: session.user.email }).select("kyc");
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      kyc: user.kyc || { status: "not_submitted", documents: [] }
    });
  } catch (error: any) {
    console.error("KYC GET error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
};

export const POST = async (req: Request) => {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const currentStatus = user.kyc?.status || "not_submitted";
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

    const cleanedAadhaar = normalizeAadhaar(aadhaarNumber);
    if (cleanedAadhaar && !/^\d{12}$/.test(cleanedAadhaar)) {
      return NextResponse.json({ message: "Invalid Aadhaar number (must be 12 digits)" }, { status: 400 });
    }

    if (panNumber && !/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber.toUpperCase())) {
      return NextResponse.json({ message: "Invalid PAN number format (e.g. ABCDE1234F)" }, { status: 400 });
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
          "Snapcart_Grocery_Single-vendor/user-kyc",
          isPdf(file) ? "raw" : "image"
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

    user.kyc = {
      status: "pending",
      documents,
      submittedAt: new Date(),
      reviewedAt: undefined,
      rejectionReason: undefined,
      aadhaarNumber: cleanedAadhaar || undefined,
      panNumber: panNumber ? panNumber.toUpperCase() : undefined,
    };

    await user.save();

    return NextResponse.json({ success: true, kyc: user.kyc });
  } catch (error: any) {
    console.error("KYC POST error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
};
