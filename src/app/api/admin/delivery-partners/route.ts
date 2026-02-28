import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryPartner } from "@/models/deliveryPartner.model";

export const dynamic = "force-dynamic";

export const GET = async () => {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.currentRole !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const partners = await DeliveryPartner.find()
      .populate("user", "name email mobileNumber")
      .lean();

    const stats = {
      total: partners.length,
      online: partners.filter((p) => p.isOnline).length,
      maleCount: partners.filter((p) => p.gender === "male").length,
      femaleCount: partners.filter((p) => p.gender === "female").length,
      otherCount: partners.filter((p) => p.gender === "other").length,
      avgRating:
        partners.length > 0
          ? parseFloat(
              (
                partners.reduce((sum, p) => sum + (p.stats?.averageRating || 0), 0) /
                partners.length
              ).toFixed(2)
            )
          : 0,
    };

    return NextResponse.json({ success: true, partners: partners || [], stats });
  } catch (error: any) {
    console.error("Error fetching delivery partners:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch delivery partners" },
      { status: 500 }
    );
  }
};
