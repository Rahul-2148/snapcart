import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import uploadOnCloudinary, {
  deleteFromCloudinary,
} from "@/lib/server/cloudinary";
import { Banner } from "@/models/banner.model";

let cachedBanners: any = null;
let lastFetchedBanners = 0;

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
    // Cache for 30 seconds
    if (cachedBanners && now - lastFetchedBanners < 30000) {
      return NextResponse.json(
        {
          success: true,
          banners: cachedBanners,
        },
        { status: 200 }
      );
    }

    await connectDb();

    // Get all active banners sorted by order
    const banners = await Banner.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .select(
        "_id title subtitle buttonText image order icon iconColor createdAt updatedAt",
      )
      .lean();

    // Ensure icon field exists with proper value
    const bannersWithIcon = banners.map((banner: any) => {
      const bannerObj = { ...banner };
      // Ensure icon is a string (not null/undefined)
      bannerObj.icon =
        bannerObj.icon && String(bannerObj.icon).trim()
          ? String(bannerObj.icon).trim()
          : "";
      return bannerObj;
    });

    cachedBanners = bannersWithIcon;
    lastFetchedBanners = now;

    return NextResponse.json(
      {
        success: true,
        banners: bannersWithIcon,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching banners:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch banners",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
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

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const subtitle = formData.get("subtitle") as string;
    const buttonText = formData.get("buttonText") as string;
    const imageFile = formData.get("image") as File | null;
    const order = parseInt(formData.get("order") as string) || 0;
    let icon = formData.get("icon") as string;
    const iconColor = (formData.get("iconColor") as string) || "#ffffff";

    // Ensure icon is not empty - use empty string if user didn't select, will be filled by frontend
    if (!icon || icon.trim() === "") {
      icon = "";
    }

    // Validate required fields
    if (!title || !subtitle || !buttonText || !imageFile) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields including image are required",
        },
        { status: 400 },
      );
    }

    // Upload image to Cloudinary
    const folder = "Snapcart_Grocery_Single-vendor/banners";
    const uploadedImage = await uploadOnCloudinary(imageFile, folder);

    if (!uploadedImage) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to upload image to Cloudinary",
        },
        { status: 400 },
      );
    }

    // Create new banner
    // Create new banner
    const newBanner = new Banner({
      title: title.trim(),
      subtitle: subtitle.trim(),
      buttonText: buttonText.trim(),
      image: uploadedImage,
      order,
      isActive: true,
    });

    // Explicitly set icon and iconColor fields
    newBanner.icon = icon;
    newBanner.iconColor = iconColor;

    await newBanner.save();

    return NextResponse.json(
      {
        success: true,
        message: "Banner created successfully",
        banner: newBanner.toObject(),
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating banner:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create banner",
      },
      { status: 500 },
    );
  }
}
