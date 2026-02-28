import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/server/db";
import { User } from "@/models/user.model";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import Review from "@/models/review.model";
import { DeliveryPartner } from "@/models/deliveryPartner.model";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.currentRole !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await dbConnect();

    const { id: partnerId } = await params;

    // Find user
    const user = await User.findById(partnerId).select(
      "name email mobileNumber roles currentRole isBlocked createdAt",
    );
    const partnerProfile = await DeliveryPartner.findOne({ user: partnerId })
      .select("kyc")
      .lean();


    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    if (!user.roles?.includes("deliveryBoy")) {
      return NextResponse.json(
        { success: false, message: "User is not a delivery partner" },
        { status: 400 },
      );
    }

    // Get all delivery assignments with error handling
    let assignments = [];
    try {
      assignments = await DeliveryAssignment.find({
        assignedTo: partnerId,
      })
        .populate({
          path: "order",
          select: "orderNumber totalAmount status createdAt deliveryAddress",
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    } catch (assignmentError) {
      console.warn("Warning: Could not fetch assignments", assignmentError);
      assignments = [];
    }

    // Calculate detailed statistics
    const completedAssignments = assignments.filter(
      (a: any) => a.status === "delivered",
    );
    const cancelledAssignments = assignments.filter(
      (a: any) => a.status === "cancelled",
    );

    const totalDeliveries = completedAssignments.length;
    const totalEarnings = completedAssignments.reduce(
      (sum: number, a: any) => sum + (a.earnings || 0),
      0,
    );

    // Calculate average rating from reviews with error handling
    let reviews = [];
    try {
      reviews = await Review.find({
        user: partnerId,
      }).select("rating").lean();
    } catch (reviewError) {
      console.warn("Warning: Could not fetch reviews", reviewError);
      reviews = [];
    }

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) /
          reviews.length
        : 0;

    // Get recent deliveries (last 7 days) for chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentDeliveries = completedAssignments.filter(
      (a: any) => new Date(a.completedAt || a.createdAt) > sevenDaysAgo,
    );

    // Calculate on-time delivery percentage
    const onTimeDeliveries = completedAssignments.filter(
      (a: any) =>
        a.completedAt &&
        new Date(a.completedAt) <= new Date(a.expectedDelivery || a.createdAt),
    ).length;

    const onTimePercentage =
      totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0;

    // Group deliveries by date for chart
    const deliveriesByDate: { [key: string]: number } = {};
    recentDeliveries.forEach((a: any) => {
      const date = new Date(a.completedAt || a.createdAt)
        .toISOString()
        .split("T")[0];
      deliveriesByDate[date] = (deliveriesByDate[date] || 0) + 1;
    });

    const chartData = Object.entries(deliveriesByDate).map(([date, count]) => ({
      date,
      count,
    }));

    return NextResponse.json({
      success: true,
      partner: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        isBlocked: user.isBlocked || false,
        joinedAt: user.createdAt,
        roles: user.roles,
        currentRole: user.currentRole,
        kyc: partnerProfile?.kyc,
      },
      stats: {
        totalDeliveries,
        cancelledDeliveries: cancelledAssignments.length,
        totalEarnings,
        averageRating: typeof avgRating === 'number' ? parseFloat(avgRating.toFixed(2)) : 0,
        onTimePercentage: parseFloat(onTimePercentage.toFixed(2)),
        ratingsCount: reviews.length,
      },
      chartData,
      recentAssignments: assignments.slice(0, 10).map((a: any) => ({
        _id: a._id,
        orderId: a.order?._id,
        orderNumber: (a.order as any)?.orderNumber,
        status: a.status,
        earnings: a.earnings || 0,
        assignedAt: a.createdAt,
        completedAt: a.completedAt,
        deliveryAddress: (a.order as any)?.deliveryAddress,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching partner details:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error?.message || "Failed to load partner details"
      },
      { status: 500 },
    );
  }
}
