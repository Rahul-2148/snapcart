import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    await connectDb();
    const { role, mobileNumber } = await req.json();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!role || !["user", "deliveryBoy"].includes(role)) {
      return NextResponse.json(
        { message: "Invalid role" },
        { status: 400 }
      );
    }

    const updatedRoles = role === "deliveryBoy" ? ["user", "deliveryBoy"] : ["user"];
    const updatedCurrentRole = role === "deliveryBoy" ? "deliveryBoy" : "user";

    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        roles: updatedRoles,
        currentRole: updatedCurrentRole,
        mobileNumber,
        profileCompleted: true,
      },
      { new: true }
    );
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return NextResponse.json(
      { success: true, message: "User updated successfully", user },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `edit role and mobile error: ${error}` },
      { status: 500 }
    );
  }
};
