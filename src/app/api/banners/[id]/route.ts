import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import uploadOnCloudinary, {
  deleteFromCloudinary,
} from "@/lib/server/cloudinary";
import { Banner } from "@/models/banner.model";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDb();
    const { id } = await params;

    const banner = await Banner.findById(id);

    if (!banner) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        banner,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching banner:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch banner",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    // Check if user is admin
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin access required." },
        { status: 401 },
      );
    }

    await connectDb();
    const { id } = await params;

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const subtitle = formData.get("subtitle") as string;
    const buttonText = formData.get("buttonText") as string;
    const imageFile = formData.get("image") as File | null;
    const order = formData.get("order") as string;
    const icon = formData.get("icon") as string;
    const iconColor = (formData.get("iconColor") as string) || "#ffffff";

    // Build update object
    const updateData: any = {};

    if (title) updateData.title = title.trim();
    if (subtitle) updateData.subtitle = subtitle.trim();
    if (buttonText) updateData.buttonText = buttonText.trim();
    if (order !== null && order !== undefined) {
      updateData.order = parseInt(order);
    }

    // Always update icon and iconColor - add fields if they don't exist
    updateData.icon = icon || "";
    updateData.iconColor = iconColor;

    console.log("🔍 Update data object:", JSON.stringify(updateData));
    console.log("🔍 Icon in updateData:", updateData.icon);

    // Handle image update if new file provided
    if (imageFile && imageFile.size > 0) {
      const folder = "Snapcart_Grocery_Single-vendor/banners";
      const uploadedImage = await uploadOnCloudinary(imageFile, folder);

      if (!uploadedImage) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to upload new image",
          },
          { status: 400 },
        );
      }

      // Get banner to delete old image
      const banner = await Banner.findById(id);
      if (banner?.image?.publicId) {
        await deleteFromCloudinary(banner.image.publicId);
      }

      updateData.image = uploadedImage;
    }

    // Use findByIdAndUpdate with $set to properly add new fields to existing documents
    const updatedBanner = await Banner.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        strict: false, // Allow adding new fields not in original document
      },
    );

    if (!updatedBanner) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 },
      );
    }

    // Return updated banner

    return NextResponse.json(
      {
        success: true,
        message: "Banner updated successfully",
        banner: updatedBanner,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error updating banner:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update banner",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    // Check if user is admin
    if (!session?.user?.currentRole || session.user.currentRole !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin access required." },
        { status: 401 },
      );
    }

    await connectDb();
    const { id } = await params;

    const banner = await Banner.findById(id);

    if (!banner) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 },
      );
    }

    // Delete image from Cloudinary
    if (banner.image?.publicId) {
      await deleteFromCloudinary(banner.image.publicId);
    }

    // Delete banner from database
    await Banner.findByIdAndDelete(id);

    return NextResponse.json(
      {
        success: true,
        message: "Banner deleted successfully",
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error deleting banner:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete banner",
      },
      { status: 500 },
    );
  }
}
