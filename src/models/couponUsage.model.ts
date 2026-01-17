// src/models/couponUsage.model.ts
import mongoose, { Schema } from "mongoose";

export interface ICouponUsage {
  coupon: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  discountAmount: number;
  usedAt?: Date;
}

const couponUsageSchema = new Schema<ICouponUsage>(
  {
    coupon: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    discountAmount: {
      type: Number,
      required: true,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

couponUsageSchema.index({ coupon: 1, user: 1 });

export const CouponUsage =
  mongoose.models.CouponUsage ||
  mongoose.model<ICouponUsage>("CouponUsage", couponUsageSchema);
