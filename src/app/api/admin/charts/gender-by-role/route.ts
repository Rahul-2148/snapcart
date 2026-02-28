import { NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || !session.user.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 403 },
      );
    }

    await connectDb();

    // Helper function to format gender data
    const formatGenderData = (counts: any[]) => {
      return counts
        .map((item) => {
          let name = "Not Specified";
          let color = "#94A3B8";

          if (item._id === "male") {
            name = "Male";
            color = "#3B82F6";
          } else if (item._id === "female") {
            name = "Female";
            color = "#EC4899";
          } else if (item._id === "other") {
            name = "Other";
            color = "#8B5CF6";
          } else if (item._id === "prefer-not-to-say") {
            name = "Prefer Not to Say";
            color = "#6B7280";
          }

          return {
            name,
            value: item.count,
            color,
          };
        })
        .sort((a, b) => b.value - a.value);
    };

    // Gender distribution for Users
    const userGenderCounts = await User.aggregate([
      { $match: { roles: "user" } },
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]);

    // Gender distribution for Delivery Boys
    const deliveryBoyGenderCounts = await User.aggregate([
      { $match: { roles: "deliveryBoy" } },
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]);

    // Gender distribution for Admins
    const adminGenderCounts = await User.aggregate([
      { $match: { roles: "admin" } },
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]);

    return NextResponse.json(
      {
        success: true,
        userData: formatGenderData(userGenderCounts),
        deliveryBoyData: formatGenderData(deliveryBoyGenderCounts),
        adminData: formatGenderData(adminGenderCounts),
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching gender distribution by role:", error);
    return NextResponse.json(
      { success: false, message: `Error: ${error.message}` },
      { status: 500 },
    );
  }
}
