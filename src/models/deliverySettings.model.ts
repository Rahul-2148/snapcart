import mongoose, { Document, Schema } from "mongoose";

export interface IDeliverySettings extends Document {
  storeLocation: {
    address: string;
    lat: number;
    lng: number;
    pincode?: string;
    city?: string;
  };
  serviceRadiusKm: number;
  broadcastBatchSize: number;
  assignmentExpiryMinutes: number;
  basePayPerKm: number;
  basePayFlat: number;
  maxParallelAssignmentsPerPartner: number;
  allowGenderFilter: boolean;
  kycRequiredForOnline: boolean;
  universalDeliveryMode: boolean;
  disablePackagingFee: boolean;
  disableWeightSurcharge: boolean;
  disableSurgeFee: boolean;
  disableDeliveryFee: boolean;
  freeDeliveryThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const deliverySettingsSchema = new Schema<IDeliverySettings>(
  {
    storeLocation: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      pincode: { type: String },
      city: { type: String },
    },
    serviceRadiusKm: { type: Number, default: 7 },
    broadcastBatchSize: { type: Number, default: 10 },
    assignmentExpiryMinutes: { type: Number, default: 6 },
    basePayPerKm: { type: Number, default: 10 },
    basePayFlat: { type: Number, default: 20 },
    maxParallelAssignmentsPerPartner: { type: Number, default: 2 },
    allowGenderFilter: { type: Boolean, default: false },
    kycRequiredForOnline: { type: Boolean, default: false },
    universalDeliveryMode: { type: Boolean, default: false },
    disablePackagingFee: { type: Boolean, default: false },
    disableWeightSurcharge: { type: Boolean, default: false },
    disableSurgeFee: { type: Boolean, default: false },
    disableDeliveryFee: { type: Boolean, default: false },
    freeDeliveryThreshold: { type: Number, default: 199 },
  },
  { timestamps: true },
);

export const DeliverySettings =
  mongoose.models.DeliverySettings ||
  mongoose.model<IDeliverySettings>("DeliverySettings", deliverySettingsSchema);
