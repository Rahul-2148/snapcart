import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { DeliverySettings } from "@/models/deliverySettings.model";
import { calculateDistance } from "@/lib/server/delivery";
import { isDeliveryPartner } from "@/lib/server/roles";

export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isDeliveryPartner(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectDb();
  const partner = await DeliveryPartner.findOne({ user: session.user.id });
  if (!partner || !partner.isOnline) {
    return NextResponse.json({ success: true, assignments: [] });
  }

  // Check if partner is suspended
  if (partner.isSuspended && partner.suspendedUntil && partner.suspendedUntil > new Date()) {
    return NextResponse.json(
      { success: false, error: "Your account is suspended. You cannot accept new orders." },
      { status: 403 },
    );
  }

  // Clear suspension if it has expired
  if (partner.isSuspended && partner.suspendedUntil && partner.suspendedUntil <= new Date()) {
    partner.isSuspended = false;
    partner.suspendedUntil = null;
    partner.consecutiveCancellations = 0;
    await partner.save();
  }

  const settings = await DeliverySettings.findOne();
  const now = new Date();
  const assignments = await DeliveryAssignment.find({
    status: "broadcasted",
    assignedTo: null,
    broadcastedTo: { $in: [partner.user] },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }).lean();

  // Sort by priority score (rating, acceptance rate, distance)
  const sortedAssignments = assignments
    .map((assignment) => {
      const distanceFromYou = partner.currentLocation?.lat
        ? calculateDistance(
            assignment.pickupLocation.lat,
            assignment.pickupLocation.lng,
            partner.currentLocation.lat,
            partner.currentLocation.lng,
          )
        : assignment.estimatedDistance;

      // Calculate priority: rating (40%) + acceptance rate (30%) + distance inverse (30%)
      const ratingScore = (partner.stats?.averageRating || 0) * 0.4;
      const acceptanceScore = (partner.stats?.acceptanceRate || 0) * 0.3;
      const serviceRadius = settings?.serviceRadiusKm || 7;
      const distanceScore =
        Math.max(0, (1 - distanceFromYou / serviceRadius) * 0.3);
      const priorityScore = ratingScore + acceptanceScore + distanceScore;

      return {
        ...assignment,
        distanceFromYou,
        priorityScore,
      };
    })
    .sort((a, b) => {
      // Sort by priority score first, then by assignment priority
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      const priorityMap = { high: 3, normal: 2, low: 1 };
      return (
        (priorityMap[b.priority as keyof typeof priorityMap] || 0) -
        (priorityMap[a.priority as keyof typeof priorityMap] || 0)
      );
    });

  return NextResponse.json({ success: true, assignments: sortedAssignments });
};
