import mongoose, { Document, Schema } from "mongoose";

export interface IDeliveryIncentive extends Document {
  title: string;
  description?: string;
  targetDeliveries?: number;
  targetEarnings?: number;
  rewardAmount: number;
  startAt: Date;
  endAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryIncentiveSchema = new Schema<IDeliveryIncentive>(
  {
    title: { type: String, required: true },
    description: { type: String },
    targetDeliveries: { type: Number },
    targetEarnings: { type: Number },
    rewardAmount: { type: Number, required: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

deliveryIncentiveSchema.index({ startAt: 1, endAt: 1, isActive: 1 });

export const DeliveryIncentive =
  mongoose.models.DeliveryIncentive ||
  mongoose.model<IDeliveryIncentive>("DeliveryIncentive", deliveryIncentiveSchema);
