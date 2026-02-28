// src/models/returnPolicy.model.ts
import mongoose, { Schema, Document } from "mongoose";

export type ReturnPolicyType =
  | "none"
  | "return-only"
  | "replacement-only"
  | "both";

export interface IReturnPolicy extends Document {
  grocery: mongoose.Types.ObjectId;
  isReturnable: boolean;
  returnWindowDays: number; // 3, 7, 10, 30 etc
  policyType: ReturnPolicyType; // return-only, replacement-only, or both
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnPolicySchema = new Schema<IReturnPolicy>(
  {
    grocery: {
      type: Schema.Types.ObjectId,
      ref: "Grocery",
      required: true,
      unique: true,
      index: true,
    },
    isReturnable: {
      type: Boolean,
      default: false,
    },
    returnWindowDays: {
      type: Number,
      default: 0,
      min: 0,
      max: 365,
    },
    policyType: {
      type: String,
      enum: ["none", "return-only", "replacement-only", "both"],
      default: "none",
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const ReturnPolicy =
  mongoose.models.ReturnPolicy ||
  mongoose.model<IReturnPolicy>("ReturnPolicy", ReturnPolicySchema);
