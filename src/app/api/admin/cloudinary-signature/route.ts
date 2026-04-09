import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { v2 as cloudinary } from "cloudinary";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || token.currentRole !== "admin") {
      return NextResponse.json(
        { success: false, message: "You are not authorized" },
        { status: 401 },
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: "Cloudinary is not configured" },
        { status: 500 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const folder =
      typeof body.folder === "string" && body.folder.trim()
        ? body.folder.trim()
        : "Snapcart_Grocery_Single-vendor/grocery-images";

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp },
      apiSecret,
    );

    return NextResponse.json({
      success: true,
      cloudName,
      apiKey,
      folder,
      timestamp,
      signature,
    });
  } catch (error: any) {
    console.error("Cloudinary signature error:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to generate Cloudinary signature: ${error.message}`,
      },
      { status: 500 },
    );
  }
}
