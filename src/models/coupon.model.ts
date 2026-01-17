// src/models/coupon.model.ts
import mongoose, { Schema } from "mongoose";

export type DiscountType = "FLAT" | "PERCENTAGE";

export interface ICoupon {
  code: string;
  discountType: DiscountType;
  discountValue: number;

  maxDiscountAmount?: number; // for percentage coupons
  minCartValue?: number;

  startDate: Date;
  endDate: Date;

  usageLimit?: number; // total usage
  usagePerUser?: number; // per user usage
  usageCount?: number; // current usage count

  applicableCategories?: mongoose.Types.ObjectId[];
  applicableProducts?: mongoose.Types.ObjectId[];

  eventTag?: string; // DIWALI_2026, NEW_USER, RAIN_SALE

  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },

    discountType: {
      type: String,
      enum: ["FLAT", "PERCENTAGE"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    maxDiscountAmount: Number,
    minCartValue: Number,

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    usageLimit: Number,
    usagePerUser: Number,
    usageCount: { type: Number, default: 0 },

    applicableCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],

    applicableProducts: [{ type: Schema.Types.ObjectId, ref: "Grocery" }],

    eventTag: { type: String, index: true },

    isActive: { type: Boolean, default: true },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Coupon =
  mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", couponSchema);
