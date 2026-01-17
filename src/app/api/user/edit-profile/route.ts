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

    const formData = await req.formData();
    const name = formData.get("name") as string;
    const mobile = formData.get("mobileNumber") as string;
    const imageFile = formData.get("image") as File | null;

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const updateData: {
      name?: string;
      mobileNumber?: string;
      image?: { url: string; publicId: string };
    } = {};

    if (name) {
      updateData.name = name;
    }

    if (mobile) {
      updateData.mobileNumber = mobile;
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

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updateData },
      { new: true }
    ).select("-password");

    const userWithHasPassword = {
      ...updatedUser.toObject(),
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
