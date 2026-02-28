import connectDb from "@/lib/server/db";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { DeliverySettings } from "@/models/deliverySettings.model";
import { getIO } from "@/lib/server/socket";
import { Types } from "mongoose";

const EARTH_RADIUS_KM = 6371;

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((EARTH_RADIUS_KM * c).toFixed(2));
};

export const estimateDeliveryTime = (distanceKm: number): number => {
  const baseMinutes = 10; // prep time
  const travelMinutes = Math.ceil(distanceKm * 4); // ~15 km/h
  return Math.max(baseMinutes + travelMinutes, 10);
};

export const getOrCreateDeliverySettings = async () => {
  await connectDb();
  let settings = await DeliverySettings.findOne();
  if (!settings) {
    settings = await DeliverySettings.create({
      storeLocation: {
        address: "Default store",
        lat: 28.6139,
        lng: 77.209,
        pincode: "000000",
        city: "",
      },
    });
  }
  return settings;
};

export const broadcastOrderToPartners = async (assignmentId: string) => {
  await connectDb();
  const assignment = await DeliveryAssignment.findById(assignmentId);
  if (!assignment) {
    throw new Error("Assignment not found");
  }

  const settings = await getOrCreateDeliverySettings();

  const partners = await DeliveryPartner.find({ isOnline: true });
  const eligiblePartners = partners
    .map((partner) => {
      if (!partner.currentLocation?.lat || !partner.currentLocation?.lng) {
        return null;
      }
      const distance = calculateDistance(
        assignment.pickupLocation.lat,
        assignment.pickupLocation.lng,
        partner.currentLocation.lat,
        partner.currentLocation.lng,
      );
      const serviceRadius = partner.serviceRadiusKm || settings.serviceRadiusKm;
      if (distance <= serviceRadius) {
        return {
          partner,
          distance,
        };
      }
      return null;
    })
    .filter(Boolean) as { partner: any; distance: number }[];

  const notDeclined = eligiblePartners.filter(({ partner }) => {
    const userId = partner.user.toString();
    const alreadyBroadcasted = assignment.broadcastedTo
      .map((id: any) => id.toString())
      .includes(userId);
    const alreadyDeclined = assignment.declinedBy
      .map((id: any) => id.toString())
      .includes(userId);
    return !alreadyBroadcasted && !alreadyDeclined;
  });

  const batchSize = settings.broadcastBatchSize || 10;
  const targets = notDeclined.slice(0, batchSize);
  const targetUserIds = targets.map(({ partner }) => partner.user);

  const mergedIds = Array.from(
    new Set([
      ...assignment.broadcastedTo.map((id: any) => id.toString()),
      ...targetUserIds.map((id: any) => id.toString()),
    ]),
  );
  assignment.broadcastedTo = mergedIds.map(
    (id) => new Types.ObjectId(id),
  ) as any;
  assignment.status = "broadcasted";
  assignment.expiresAt = new Date(
    Date.now() + (settings.assignmentExpiryMinutes || 6) * 60 * 1000,
  );
  await assignment.save();

  const payload = {
    assignmentId: assignment._id.toString(),
    orderNumber: assignment.orderNumber,
    pickupLocation: assignment.pickupLocation,
    deliveryLocation: assignment.deliveryLocation,
    estimatedDistance: assignment.estimatedDistance,
    estimatedTime: assignment.estimatedTime,
    priority: assignment.priority,
  };

  const ioClient = getIO();
  if (ioClient) {
    ioClient.emit("new_delivery_request", payload);
  }

  return { broadcastCount: targets.length };
};

export const computePayout = (
  distanceKm: number,
  settings: any,
  surgeFactor: number = 1,
) => {
  const base = settings?.basePayFlat || 20;
  const variable = (settings?.basePayPerKm || 10) * distanceKm;
  const payout = base + variable;
  return Math.round(payout * surgeFactor);
};

// Generate random 4-digit OTP
export const generateOTP = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Calculate surge factor based on current hour and day
export const calculateSurgeFactor = (): number => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  // Peak hours: 8-9 AM, 12-2 PM, 6-9 PM (multiplier 1.5x)
  const peakHours = [8, 12, 13, 18, 19, 20];
  const isPeakHour = peakHours.includes(hour);

  // Weekends surge (multiplier 1.2x)
  const isWeekend = day === 0 || day === 6;

  let factor = 1;
  if (isPeakHour) factor *= 1.5;
  if (isWeekend) factor *= 1.2;

  return Math.min(factor, 2.5); // Cap at 2.5x
};

// Priority matching: sort partners by rating, acceptance rate, and distance
export const getSortedPartnersByPerformance = (
  partners: any[],
  assignment: any,
  settings: any,
): { partner: any; distance: number; priority: number }[] => {
  return partners
    .map((partner) => {
      if (!partner.currentLocation?.lat || !partner.currentLocation?.lng) {
        return null;
      }
      const distance = calculateDistance(
        assignment.pickupLocation.lat,
        assignment.pickupLocation.lng,
        partner.currentLocation.lat,
        partner.currentLocation.lng,
      );
      const serviceRadius = partner.serviceRadiusKm || settings.serviceRadiusKm;
      if (distance > serviceRadius) {
        return null;
      }

      // Calculate priority score (higher = better)
      // 40% rating, 30% acceptance rate, 30% distance (inverse)
      const ratingScore = (partner.stats?.averageRating || 0) * 0.4;
      const acceptanceScore = (partner.stats?.acceptanceRate || 0) * 0.3;
      const distanceScore = Math.max(0, (1 - distance / serviceRadius) * 0.3);
      const priorityScore = ratingScore + acceptanceScore + distanceScore;

      return { partner, distance, priority: priorityScore };
    })
    .filter(Boolean)
    .sort((a, b) => b!.priority - a!.priority) as {
    partner: any;
    distance: number;
    priority: number;
  }[];
};
