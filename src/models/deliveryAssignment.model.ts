// src/models/deliveryAssignment.model.ts
import mongoose, { Document, Schema, Types } from "mongoose";

export type DeliveryAssignmentStatus =
  | "broadcasted"
  | "assigned"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export interface IDeliveryAssignment extends Document {
  order: Types.ObjectId;
  orderNumber: string;
  broadcastedTo: Types.ObjectId[];
  declinedBy: Types.ObjectId[];
  assignedTo: Types.ObjectId | null;
  status: DeliveryAssignmentStatus;
  acceptedAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  reasonForCancellation: string | null;
  expiresAt: Date | null;
  pickupLocation: {
    address: string;
    lat: number;
    lng: number;
    pincode?: string;
  };
  deliveryLocation: {
    address: string;
    fullName?: string;
    mobile?: string;
    lat: number;
    lng: number;
    pincode?: string;
  };
  estimatedDistance: number;
  estimatedTime: number;
  priority: "high" | "normal" | "low";
  rewardAmount: number;
  timeline: {
    status: string;
    timestamp: Date;
    note?: string;
  }[];
  // OTP & Delivery Verification
  deliveryOTP?: string | null;
  otpGeneratedAt?: Date | null;
  otpVerifiedAt?: Date | null;
  otpAttempts?: number;
  deliveryPhotos?: string[]; // URLs of delivery photos
  deliverySignature?: string | null; // Customer signature data URL
  // Rating & Review
  rating?: {
    score: number; // 1-5
    review?: string;
    ratedAt?: Date;
    ratedBy?: string; // "customer" or "partner"
  } | null;
  partnerCancellationCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryAssignmentSchema = new Schema<IDeliveryAssignment>(
  {
    order: {
      type: Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    broadcastedTo: [
      {
        type: Types.ObjectId,
        ref: "User",
        required: false,
        default: [],
      },
    ],
    declinedBy: [
      {
        type: Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    assignedTo: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "broadcasted",
        "assigned",
        "picked_up",
        "on_the_way",
        "delivered",
        "cancelled",
      ],
      default: "broadcasted",
      index: true,
    },
    acceptedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    reasonForCancellation: { type: String, default: null },
    expiresAt: { type: Date, default: null, index: true },
    pickupLocation: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      pincode: { type: String },
    },
    deliveryLocation: {
      address: { type: String, required: true },
      fullName: { type: String },
      mobile: { type: String },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      pincode: { type: String },
    },
    estimatedDistance: { type: Number, default: 0 },
    estimatedTime: { type: Number, default: 30 },
    priority: {
      type: String,
      enum: ["high", "normal", "low"],
      default: "normal",
    },
    rewardAmount: { type: Number, default: 0 },
    timeline: {
      type: [
        {
          status: { type: String, required: true },
          timestamp: { type: Date, required: true },
          note: { type: String },
          _id: false,
        },
      ],
      default: [],
    },
    // OTP & Delivery Verification
    deliveryOTP: { type: String, default: null },
    otpGeneratedAt: { type: Date, default: null },
    otpVerifiedAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    deliveryPhotos: {
      type: [String],
      default: [],
    },
    deliverySignature: { type: String, default: null },
    // Rating & Review
    rating: {
      score: { type: Number, min: 1, max: 5 },
      review: { type: String },
      ratedAt: { type: Date },
      ratedBy: { type: String, enum: ["customer", "partner"] },
      _id: false,
    },
    partnerCancellationCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const DeliveryAssignment =
  mongoose.models.DeliveryAssignment ||
  mongoose.model<IDeliveryAssignment>(
    "DeliveryAssignment",
    deliveryAssignmentSchema,
  );
