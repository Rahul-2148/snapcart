// src/models/cart.model.ts
import mongoose, { Types } from "mongoose";

export interface ICart {
  user: mongoose.Types.ObjectId;
  coupon?: {
    couponId?: Types.ObjectId;
    code?: string;
    discountType?: "FLAT" | "PERCENTAGE";
    discountValue?: number;
    maxDiscountAmount?: number;
    minCartValue?: number;
    discountAmount?: number;
  };
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const cartSchema = new mongoose.Schema<ICart>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
      index: true,
    },

    coupon: {
      couponId: { type: Types.ObjectId, ref: "Coupon" },
      code: String,
      discountType: { type: String, enum: ["FLAT", "PERCENTAGE"] },
      discountValue: Number,
      maxDiscountAmount: Number,
      minCartValue: Number,
      discountAmount: Number,
    },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Cart =
  mongoose.models.Cart || mongoose.model<ICart>("Cart", cartSchema);
