// API to get gender distribution of all users
import { NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();

    // Check if user is admin
    if (!session?.user || !session.user.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 403 },
      );
    }

    await connectDb();

    // Aggregate gender data
    const genderCounts = await User.aggregate([
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format data for chart with colors
    const genderData = genderCounts
      .map((item) => {
        let name = "Not Specified";
        let color = "#94A3B8"; // gray

        if (item._id === "male") {
          name = "Male";
          color = "#3B82F6"; // blue
        } else if (item._id === "female") {
          name = "Female";
          color = "#EC4899"; // pink
        } else if (item._id === "other") {
          name = "Other";
          color = "#8B5CF6"; // purple
        } else if (item._id === "prefer-not-to-say") {
          name = "Prefer Not to Say";
          color = "#6B7280"; // gray-500
        }

        return {
          name,
          value: item.count,
          color,
        };
      })
      .sort((a, b) => b.value - a.value); // Sort by count descending

    return NextResponse.json({ success: true, genderData }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching gender distribution:", error);
    return NextResponse.json(
      { success: false, message: `Error: ${error.message}` },
      { status: 500 },
    );
  }
}
