// src/models/flashDeal.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IFlashDeal extends Document {
  groceryVariant: mongoose.Types.ObjectId;
  flashPrice: number;
  startTime: Date;
  endTime: Date;
  dealStock: number; // Max stock available at this flash price
  soldCount: number; // Count of items sold under this deal
  limitPerUser: number; // Max quantity a single user can buy in one order
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const flashDealSchema = new Schema<IFlashDeal>(
  {
    groceryVariant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroceryVariant",
      required: true,
      index: true,
    },
    flashPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
      index: true,
    },
    dealStock: {
      type: Number,
      required: true,
      min: 0,
    },
    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    limitPerUser: {
      type: Number,
      default: 2,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const FlashDeal =
  mongoose.models.FlashDeal || mongoose.model<IFlashDeal>("FlashDeal", flashDealSchema);
