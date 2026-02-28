import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { DeliveryRating } from "@/models/deliveryRating.model";
import { User } from "@/models/user.model";
import { Order } from "@/models/order.model";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const { assignmentId, score, review, categories, ratedBy } =
      await req.json();

    if (!assignmentId || !score || score < 1 || score > 5) {
      return NextResponse.json(
        { error: "Invalid score or assignmentId" },
        { status: 400 },
      );
    }

    const assignment =
      await DeliveryAssignment.findById(assignmentId).populate("order");
    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    // Get order and delivery partner info
    const order = await Order.findById(assignment.order);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Determine rater role
    let actualRatedBy = ratedBy || "customer";
    if (session.user.currentRole === "deliveryBoy") {
      actualRatedBy = "partner";
    }

    // Check authorization - customer can rate partner, partner can rate customer
    if (
      actualRatedBy === "customer" &&
      session.user.id !== order.customer.toString()
    ) {
      return NextResponse.json(
        { error: "Only customer can rate delivery" },
        { status: 403 },
      );
    }
    if (
      actualRatedBy === "partner" &&
      session.user.id !== assignment.assignedTo.toString()
    ) {
      return NextResponse.json(
        { error: "Only assigned partner can rate customer" },
        { status: 403 },
      );
    }

    // Check if already rated by same person
    const existingRating = await DeliveryRating.findOne({
      assignment: assignmentId,
      ratedBy: actualRatedBy,
    });

    if (existingRating) {
      return NextResponse.json(
        { error: "You have already rated this delivery" },
        { status: 400 },
      );
    }

    // Create rating
    const rating = await DeliveryRating.create({
      assignment: assignmentId,
      order: order._id,
      deliveryPartner: assignment.assignedTo,
      customer: order.customer,
      score,
      review,
      categories,
      ratedBy: actualRatedBy,
    });

    // Update assignment
    assignment.rating = {
      score,
      review,
      ratedAt: new Date(),
      ratedBy: actualRatedBy,
    };
    await assignment.save();

    // Update delivery partner's average rating if customer rated
    if (actualRatedBy === "customer") {
      const partner = await DeliveryPartner.findOne({
        user: assignment.assignedTo,
      });
      if (partner) {
        const allRatings = await DeliveryRating.find({
          deliveryPartner: assignment.assignedTo,
          ratedBy: "customer",
        });

        const totalScore = allRatings.reduce((sum, r) => sum + r.score, 0);
        partner.stats.averageRating = totalScore / allRatings.length;
        partner.stats.totalRatings = allRatings.length;
        await partner.save();
      }
    }

    return NextResponse.json({
      message: "Rating submitted successfully",
      rating: {
        id: rating._id,
        score: rating.score,
        ratedBy: rating.ratedBy,
      },
    });
  } catch (error) {
    console.error("[Rating Error]", error);
    return NextResponse.json(
      { error: "Failed to submit rating" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const assignmentId = req.nextUrl.searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId is required" },
        { status: 400 },
      );
    }

    await connectDb();
    const ratings = await DeliveryRating.find({
      assignment: assignmentId,
    }).populate("ratedBy");

    return NextResponse.json({
      ratings,
      summary: {
        customerRating: ratings.find((r) => r.ratedBy === "customer"),
        partnerRating: ratings.find((r) => r.ratedBy === "partner"),
      },
    });
  } catch (error) {
    console.error("[Rating Fetch Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 },
    );
  }
}
