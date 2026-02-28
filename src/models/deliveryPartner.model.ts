import mongoose, { Document, Schema, Types } from "mongoose";

export interface IDeliveryPartner extends Document {
  user: Types.ObjectId;
  gender?: "male" | "female" | "other";
  vehicleType?: string;
  isOnline: boolean;
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt?: Date;
  };
  serviceRadiusKm?: number;
  availability?: {
    lastOnlineAt?: Date;
    lastOfflineAt?: Date;
  };
  stats: {
    totalDeliveries: number;
    cancelledDeliveries: number;
    acceptanceRate: number;
    averageRating: number;
    averageDeliveryTimeMinutes?: number;
    totalRatings?: number;
  };
  earnings: {
    total: number;
    pendingPayout: number;
    currentSession: number;
    lastPayoutAt?: Date;
    surgeEarnings?: number; // Earnings from peak hour surges
  };
  activeAssignment?: Types.ObjectId | null;
  kyc?: {
    status: "not_submitted" | "pending" | "approved" | "rejected";
    documents: Array<{
      type: "aadhaar_front" | "aadhaar_back" | "pan" | "license" | "selfie";
      url: string;
      publicId: string;
      uploadedAt: Date;
    }>;
    submittedAt?: Date;
    reviewedAt?: Date;
    reviewedBy?: Types.ObjectId;
    rejectionReason?: string;
    aadhaarNumber?: string;
    panNumber?: string;
    licenseNumber?: string;
  };
  // Performance & Penalties
  consecutiveCancellations?: number;
  lastCancellationAt?: Date | null;
  isSuspended?: boolean; // Suspend if too many cancellations
  suspendedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryPartnerSchema = new Schema<IDeliveryPartner>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    vehicleType: { type: String },
    isOnline: { type: Boolean, default: false },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
      _id: false,
    },
    serviceRadiusKm: { type: Number, default: 7 },
    availability: {
      lastOnlineAt: { type: Date },
      lastOfflineAt: { type: Date },
      _id: false,
    },
    stats: {
      totalDeliveries: { type: Number, default: 0 },
      cancelledDeliveries: { type: Number, default: 0 },
      acceptanceRate: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      averageDeliveryTimeMinutes: { type: Number, default: 0 },
      totalRatings: { type: Number, default: 0 },
      _id: false,
    },
    earnings: {
      total: { type: Number, default: 0 },
      pendingPayout: { type: Number, default: 0 },
      currentSession: { type: Number, default: 0 },
      lastPayoutAt: { type: Date },
      surgeEarnings: { type: Number, default: 0 },
      _id: false,
    },
    activeAssignment: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryAssignment",
      default: null,
      index: true,
    },
    kyc: {
      status: {
        type: String,
        enum: ["not_submitted", "pending", "approved", "rejected"],
        default: "not_submitted",
        index: true,
      },
      documents: [
        {
          type: {
            type: String,
            enum: ["aadhaar_front", "aadhaar_back", "pan", "license", "selfie"],
            required: true,
          },
          url: { type: String, required: true },
          publicId: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
          _id: false,
        },
      ],
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      rejectionReason: { type: String },
      aadhaarNumber: { type: String },
      panNumber: { type: String },
      licenseNumber: { type: String },
      _id: false,
    },
    // Performance & Penalties
    consecutiveCancellations: { type: Number, default: 0 },
    lastCancellationAt: { type: Date, default: null },
    isSuspended: { type: Boolean, default: false, index: true },
    suspendedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

export const DeliveryPartner =
  mongoose.models.DeliveryPartner ||
  mongoose.model<IDeliveryPartner>("DeliveryPartner", deliveryPartnerSchema);
