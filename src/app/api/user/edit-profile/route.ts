import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import uploadOnCloudinary, {
  deleteFromCloudinary,
} from "@/lib/server/cloudinary";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const contentType = req.headers.get("content-type") || "";
    let name: string | undefined;
    let mobile: string | undefined;
    let gender: string | undefined;
    let imageFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      name = (formData.get("name") as string) || undefined;
      mobile = (formData.get("mobileNumber") as string) || undefined;
      gender = (formData.get("gender") as string) || undefined;
      imageFile = (formData.get("image") as File) || null;
    } else {
      const body = await req.json();
      name = body.name;
      mobile = body.mobileNumber;
      gender = body.gender;
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const updateData: {
      name?: string;
      mobileNumber?: string;
      gender?: string | null;
      image?: { url: string; publicId: string };
    } = {};

    if (name) {
      updateData.name = name;
    }

    if (mobile) {
      updateData.mobileNumber = mobile;
    }

    if (typeof gender === "string") {
      const allowedGenders = ["male", "female", "other", "prefer-not-to-say"];
      if (gender === "") {
        updateData.gender = null;
      } else if (allowedGenders.includes(gender)) {
        updateData.gender = gender;
      } else {
        updateData.gender = null;
      }
    }

    if (imageFile) {
      const oldImagePublicId = user.image?.publicId;

      const folder = "Snapcart_Grocery_Single-vendor/user-profiles";
      const uploadedImage = await uploadOnCloudinary(imageFile, folder);

      if (uploadedImage) {
        updateData.image = uploadedImage;
        if (oldImagePublicId) {
          await deleteFromCloudinary(oldImagePublicId);
        }
      }
    }

    // If there is nothing to update, just return the user
    if (Object.keys(updateData).length === 0) {
      const userWithoutPassword = await User.findById(user._id).select(
        "-password"
      );
      return NextResponse.json({ user: userWithoutPassword }, { status: 200 });
    }

    console.log("💾 Saving user with data:", updateData);

    if (updateData.name !== undefined) {
      user.name = updateData.name;
    }
    if (updateData.mobileNumber !== undefined) {
      user.mobileNumber = updateData.mobileNumber;
    }
    if (updateData.gender !== undefined) {
      user.gender = updateData.gender;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).lean();
    const userWithHasPassword = {
      ...updatedUser,
      hasPassword: !!user.password, // user has the password field since not selected
    };

    return NextResponse.json(
      { user: userWithHasPassword, message: "Profile updated successfully!" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { message: `Error updating user profile: ${error.message}` },
      { status: 500 }
    );
  }
}
