import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { v2 as cloudinary } from "cloudinary";
import { isDeliveryPartner } from "@/lib/server/roles";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDb();
    const formData = await req.formData();
    const assignmentId = formData.get("assignmentId") as string;
    const photo = formData.get("photo") as File;

    if (!assignmentId || !photo) {
      return NextResponse.json(
        { error: "assignmentId and photo are required" },
        { status: 400 },
      );
    }

    const assignment = await DeliveryAssignment.findById(assignmentId);
    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    // Verify delivery partner is assigned
    if (assignment.assignedTo.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate file type and size
    if (!photo.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 },
      );
    }

    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 },
      );
    }

    // Upload to Cloudinary
    const buffer = await photo.arrayBuffer();

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `snapcart/deliveries/${assignmentId}`,
          resource_type: "auto",
          quality: "auto",
          fetch_format: "auto",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      stream.end(Buffer.from(buffer));
    });

    const photoUrl = (uploadResult as any).secure_url;

    // Add photo to assignment
    if (!assignment.deliveryPhotos) {
      assignment.deliveryPhotos = [];
    }
    assignment.deliveryPhotos.push(photoUrl);
    await assignment.save();

    return NextResponse.json({
      message: "Photo uploaded successfully",
      photoUrl,
      photoCount: assignment.deliveryPhotos.length,
    });
  } catch (error) {
    console.error("[Photo Upload Error]", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignmentId = req.nextUrl.searchParams.get("assignmentId");
    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId is required" },
        { status: 400 },
      );
    }

    await connectDb();
    const assignment = await DeliveryAssignment.findById(assignmentId);
    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      photos: assignment.deliveryPhotos || [],
      count: assignment.deliveryPhotos?.length || 0,
    });
  } catch (error) {
    console.error("[Photo Fetch Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 },
    );
  }
}
